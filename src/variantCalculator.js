var VariantCalculator = (function() { // jshint ignore:line
    var _VariantCalculator = function(options) {
        this.visitor = options.visitor;
        this.splitName = options.splitName;

        if (!this.visitor) {
            throw new Error('must provide visitor');
        } else if (!this.splitName) {
            throw new Error('must provide splitName');
        }
    };

    _VariantCalculator.prototype.getVariant = function() {
        if (!TestTrackConfig.getSplitRegistry()) {
            return null;
        }

        var bucketCeiling = 0,
            assignmentBucket = this.getAssignmentBucket(),
            weighting = this.getWeighting(),
            sortedVariants = this.getSortedVariants();

        for (var i = 0; i < sortedVariants.length; i++) {
            var variant = sortedVariants[i];

            bucketCeiling += weighting[variant];
            if (bucketCeiling > assignmentBucket) {
                return variant;
            }
        }

        throw new Error('Assignment bucket out of range. ' + assignmentBucket + ' unmatched in ' + this.splitName + ': ' + JSON.stringify(weighting));
    };

    _VariantCalculator.prototype.getSplitVisitorHash = function() {
        return md5(this.splitName + this.visitor.getId());
    };

    _VariantCalculator.prototype.getHashFixnum = function() {
        return parseInt(this.getSplitVisitorHash().substr(0, 8), 16);
    };

    _VariantCalculator.prototype.getAssignmentBucket = function() {
        return this.getHashFixnum() % 100;
    };

    _VariantCalculator.prototype.getSortedVariants = function() {
        return this.getVariants().sort();
    };

    _VariantCalculator.prototype.getVariants = function() {
        return Object.getOwnPropertyNames(this.getWeighting());
    };

    _VariantCalculator.prototype.getWeighting = function() {
        var weighting = TestTrackConfig.getSplitRegistry()[this.splitName];

        if (!weighting) {
            var message = 'Unknown split: "' + this.splitName + '"';
            this.visitor.logError(message);
            throw new Error(message);
        }

        return weighting;
    };

    return _VariantCalculator;
})();
