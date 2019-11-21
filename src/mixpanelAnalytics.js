class MixpanelAnalytics {
  trackAssignment(visitorId, assignment, callback) {
    const assignmentProperties = {
      TTVisitorID: visitorId,
      SplitName: assignment.getSplitName(),
      SplitVariant: assignment.getVariant(),
      SplitContext: assignment.getContext()
    };

    if (window.mixpanel) {
      window.mixpanel.track('SplitAssigned', assignmentProperties, callback);
    }
  }

  identify(visitorId) {
    if (window.mixpanel) {
      window.mixpanel.identify(visitorId);
    }
  }

  alias(visitorId) {
    if (window.mixpanel) {
      window.mixpanel.alias(visitorId);
    }
  }
}
export default MixpanelAnalytics;
