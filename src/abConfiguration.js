var ABConfiguration = (function() { // jshint ignore:line
    var _ABConfiguration = function(options) {
        if (!options.splitName) {
            throw new Error('must provide splitName');
        } else if (!options.hasOwnProperty('trueVariant')) {
            throw new Error('must provide trueVariant');
        } else if (!options.visitor) {
            throw new Error('must provide visitor');
        }

        this._splitName = options.splitName;
        this._trueVariant = options.trueVariant;
        this._visitor = options.visitor;
        this._splitRegistry = TestTrackConfig.getSplitRegistry();
    };

    _ABConfiguration.prototype.getVariants = function() {
        var splitVariants = this._getSplitVariants();
        if (splitVariants && splitVariants.length > 2) {
            this._visitor.logError('A/B for ' + this._splitName + ' configures split with more than 2 variants');
        }

        return {
            'true': this._getTrueVariant(),
            'false': this._getFalseVariant()
        };
    };

    // private

    _ABConfiguration.prototype._getTrueVariant = function() {
        return this._trueVariant || true;
    };

    _ABConfiguration.prototype._getFalseVariant = function() {
        var nonTrueVariants = this._getNonTrueVariants();
        return nonTrueVariants ? nonTrueVariants.sort()[0] : false;
    };

    _ABConfiguration.prototype._getNonTrueVariants = function() {
        var splitVariants = this._getSplitVariants();

        if (splitVariants) {
            var trueVariant = this._getTrueVariant(),
                trueVariantIndex = splitVariants.indexOf(trueVariant);

            if (trueVariantIndex !== -1) {
                splitVariants.splice(trueVariantIndex, 1); // remove the true variant
            }

            return splitVariants;
        } else {
            return null;
        }
    };

    _ABConfiguration.prototype._getSplit = function() {
        return this._splitRegistry ? this._splitRegistry[this._splitName] : null;
    };

    _ABConfiguration.prototype._getSplitVariants = function() {
        return this._getSplit() && Object.getOwnPropertyNames(this._getSplit());
    };

    return _ABConfiguration;
})();
