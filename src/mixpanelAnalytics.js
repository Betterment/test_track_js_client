var MixpanelAnalytics = function() {};

MixpanelAnalytics.prototype.trackAssignment = function(visitorId, assignment, callback) {
  var assignmentProperties = {
    TTVisitorID: visitorId,
    SplitName: assignment.getSplitName(),
    SplitVariant: assignment.getVariant(),
    SplitContext: assignment.getContext()
  };
  window.mixpanel && window.mixpanel.track('SplitAssigned', assignmentProperties, callback);
};

MixpanelAnalytics.prototype.identify = function(visitorId) {
  window.mixpanel && window.mixpanel.identify(visitorId);
};

MixpanelAnalytics.prototype.alias = function(visitorId) {
  window.mixpanel && window.mixpanel.alias(visitorId);
};

export default MixpanelAnalytics;
