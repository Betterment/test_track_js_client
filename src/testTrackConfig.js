var TestTrackConfig = (function() { // jshint ignore:line
    var config,
        assignments,
        getConfig = function() {
            if (!config) {
                var parser = new ConfigParser();
                config = parser.getConfig();
            }
            return config;
        };

    return {
        getUrl: function() {
            return getConfig().url;
        },

        getCookieDomain: function() {
            return getConfig().cookieDomain;
        },

        getSplitRegistry: function() {
            return getConfig().registry;
        },

        getAssignments: function() {
            var rawAssignments = getConfig().assignments;

            if (!rawAssignments) {
                return null;
            }

            if (!assignments) {
                assignments = [];
                for (var splitName in rawAssignments) {
                    assignments.push(new Assignment({
                        splitName: splitName,
                        variant: rawAssignments[splitName],
                        isUnsynced: false
                    }));
                }
            }

            return assignments;
        }
    };
})();
