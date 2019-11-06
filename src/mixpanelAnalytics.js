const MixpanelAnalytics = function() {};

MixpanelAnalytics.prototype.trackAssignment = function(visitorId, assignment, callback) {
  const assignmentProperties = {
    TTVisitorID: visitorId,
    SplitName: assignment.getSplitName(),
    SplitVariant: assignment.getVariant(),
    SplitContext: assignment.getContext()
  };

  if (window.mixpanel) {
    window.mixpanel.track('SplitAssigned', assignmentProperties, callback);
  }
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
