import client from './api';
import ABConfiguration from './abConfiguration';
import Assignment from './assignment';
import AssignmentNotification from './assignmentNotification';
import Identifier from './identifier';
import MixpanelAnalytics from './mixpanelAnalytics';
import TestTrackConfig from './testTrackConfig';
import uuid from 'uuid/v4';
import VariantCalculator from './variantCalculator';
import VaryDSL from './varyDSL';
import { VaryOptions, AbOptions } from './session';

export type VisitorOptions = {
  id: string;
  assignments: Assignment[];
  ttOffline?: boolean;
};

type AssignmentRegistry = {
  [splitName: string]: Assignment;
};

class Visitor {
  static loadVisitor(visitorId?: string) {
    if (visitorId) {
      const assignments = TestTrackConfig.getAssignments();
      if (assignments) {
        return Promise.resolve(
          new Visitor({
            id: visitorId,
            assignments,
            ttOffline: false
          })
        );
      } else {
        return client
          .get('/v1/visitors/' + visitorId, { timeout: 5000 })
          .then(({ data }) => {
            return new Visitor({
              id: data.id,
              assignments: Assignment.fromJsonArray(data.assignments),
              ttOffline: false
            });
          })
          .catch(() => {
            return new Visitor({
              id: visitorId,
              assignments: [],
              ttOffline: true
            });
          });
      }
    } else {
      return Promise.resolve(
        new Visitor({
          id: uuid(),
          assignments: [],
          ttOffline: false
        })
      );
    }
  }

  private _id: string;
  private _assignments: Assignment[];
  private _ttOffline?: boolean;
  private _errorLogger: (errorMessage: string) => void;
  private _assignmentRegistry?: AssignmentRegistry | null;

  public analytics: MixpanelAnalytics;

  constructor({ id, assignments, ttOffline }: VisitorOptions) {
    this._id = id;
    this._assignments = assignments;
    this._ttOffline = ttOffline;

    if (!this._id) {
      throw new Error('must provide id');
    } else if (!this._assignments) {
      throw new Error('must provide assignments');
    }

    this._errorLogger = function(errorMessage) {
      window.console.error(errorMessage);
    };

    this.analytics = new MixpanelAnalytics();
  }

  getId() {
    return this._id;
  }

  getAssignmentRegistry() {
    if (!this._assignmentRegistry) {
      this._assignmentRegistry = this._assignments.reduce((registry, assignment) => {
        return {
          ...registry,
          [assignment.getSplitName()]: assignment
        };
      }, {});
    }

    return this._assignmentRegistry;
  }

  vary(splitName: string, options: VaryOptions) {
    if (typeof options.variants !== 'object') {
      throw new Error('must provide variants object to `vary` for ' + splitName);
    } else if (!options.context) {
      throw new Error('must provide context to `vary` for ' + splitName);
    } else if (!options.defaultVariant && options.defaultVariant !== false) {
      throw new Error('must provide defaultVariant to `vary` for ' + splitName);
    }

    const defaultVariant = options.defaultVariant.toString();
    const { variants, context } = options;

    if (!variants.hasOwnProperty(defaultVariant)) {
      throw new Error('defaultVariant: ' + defaultVariant + ' must be represented in variants object');
    }

    const assignment = this._getAssignmentFor(splitName, context);
    const vary = new VaryDSL({
      assignment,
      visitor: this
    });

    for (let variant in variants) {
      if (variants.hasOwnProperty(variant)) {
        if (variant === defaultVariant) {
          vary.default(variant, variants[variant]);
        } else {
          vary.when(variant, variants[variant]);
        }
      }
    }

    vary.run();

    if (vary.isDefaulted()) {
      assignment.setVariant(vary.getDefaultVariant()!);
      assignment.setUnsynced(true);
      assignment.setContext(context);
    }

    this.notifyUnsyncedAssignments();
  }

  ab(splitName: string, options: AbOptions) {
    const abConfiguration = new ABConfiguration({
      splitName,
      trueVariant: options.trueVariant,
      visitor: this
    });
    const variants = abConfiguration.getVariants();
    const variantConfiguration: VaryOptions['variants'] = {};

    variantConfiguration[variants.true.toString()] = function() {
      options.callback(true);
    };

    variantConfiguration[variants.false.toString()] = function() {
      options.callback(false);
    };

    this.vary(splitName, {
      context: options.context,
      variants: variantConfiguration,
      defaultVariant: variants.false
    });
  }

  setErrorLogger(errorLogger: (errorMessage: string) => void) {
    if (typeof errorLogger !== 'function') {
      throw new Error('must provide function for errorLogger');
    }

    this._errorLogger = errorLogger;
  }

  logError(errorMessage: string) {
    this._errorLogger.call(null, errorMessage); // call with null context to ensure we don't leak the visitor object to the outside world
  }

  linkIdentifier(identifierType: string, value: number) {
    const identifier = new Identifier({
      identifierType,
      value,
      visitorId: this.getId()
    });

    return identifier.save().then(otherVisitor => {
      this._merge(otherVisitor);
      this.notifyUnsyncedAssignments();
    });
  }

  setAnalytics(analytics: MixpanelAnalytics) {
    if (typeof analytics !== 'object') {
      throw new Error('must provide object for setAnalytics');
    } else {
      this.analytics = analytics;
    }
  }

  notifyUnsyncedAssignments() {
    this._getUnsyncedAssignments().forEach(this._notify.bind(this));
  }

  _getUnsyncedAssignments() {
    const registry = this.getAssignmentRegistry();
    return Object.keys(registry).reduce<Assignment[]>((result, assignmentName) => {
      const assignment = registry[assignmentName];
      if (assignment.isUnsynced()) {
        result.push(assignment);
      }
      return result;
    }, []);
  }

  _merge(otherVisitor: Visitor) {
    const assignmentRegistry = this.getAssignmentRegistry();
    const otherAssignmentRegistry = otherVisitor.getAssignmentRegistry();

    this._id = otherVisitor.getId();

    Object.assign(assignmentRegistry, otherAssignmentRegistry);
  }

  _getAssignmentFor(splitName: string, context: string) {
    return this.getAssignmentRegistry()[splitName] || this._generateAssignmentFor(splitName, context);
  }

  _generateAssignmentFor(splitName: string, context: string) {
    const variant = new VariantCalculator({
      visitor: this,
      splitName: splitName
    }).getVariant();

    if (!variant) {
      this._ttOffline = true;
    }

    const assignment = new Assignment({
      splitName: splitName,
      variant: variant,
      context: context,
      isUnsynced: true
    });

    this._assignments.push(assignment);

    // reset derived datastores to trigger rebuilding
    this._assignmentRegistry = null;

    return assignment;
  }

  _notify(assignment: Assignment) {
    try {
      if (this._ttOffline) {
        return;
      }

      const notification = new AssignmentNotification({
        visitor: this,
        assignment
      });

      notification.send();
      assignment.setUnsynced(false);
    } catch (e) {
      this.logError('test_track notify error: ' + e);
    }
  }
}

export default Visitor;
