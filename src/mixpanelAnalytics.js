const MixpanelAnalytics = function() {};

MixpanelAnalytics.prototype.trackAssignment = function(visitorId, assignment) {
  const assignmentProperties = {
    TTVisitorID: visitorId,
    SplitName: assignment.getSplitName(),
    SplitVariant: assignment.getVariant(),
    SplitContext: assignment.getContext()
  };

  return new Promise(resolve => {
    if (window.mixpanel) {
      window.mixpanel.track('SplitAssigned', assignmentProperties, resolve);
    }
  });
};

MixpanelAnalytics.prototype.identify = function(visitorId) {
  if (window.mixpanel) {
    window.mixpanel.identify(visitorId);
  }
};

MixpanelAnalytics.prototype.alias = function(visitorId) {
  if (window.mixpanel) {
    window.mixpanel.alias(visitorId);
  }
};

export default MixpanelAnalytics;
