var MixpanelAnalytics = function() {};

MixpanelAnalytics.prototype.trackAssignment = function(visitorId, assignment) {
  var assignmentProperties = {
      TTVisitorID: visitorId,
      SplitName: assignment.getSplitName(),
      SplitVariant: assignment.getVariant(),
      SplitContext: assignment.getContext()
    },
    resolver,
    promise = new Promise(function(resolve) {
      resolver = resolve;
    });

  window.mixpanel && window.mixpanel.track('SplitAssigned', assignmentProperties, resolver);

  return promise;
};

MixpanelAnalytics.prototype.identify = function(visitorId) {
  window.mixpanel && window.mixpanel.identify(visitorId);
};

MixpanelAnalytics.prototype.alias = function(visitorId) {
  window.mixpanel && window.mixpanel.alias(visitorId);
};

export default MixpanelAnalytics;
