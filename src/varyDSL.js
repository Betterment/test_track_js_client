var VaryDSL = (function() { // jshint ignore:line
    var _VaryDSL = function(options) {
        if (!options.assignment) {
            throw new Error('must provide assignment');
        } else if (!options.visitor) {
            throw new Error('must provide visitor');
        }

        this._assignment = options.assignment;
        this._visitor = options.visitor;
        this._splitRegistry = TestTrackConfig.getSplitRegistry();

        this._variantHandlers = {};
    };

    _VaryDSL.prototype.when = function() {
        // these 5 lines are messy because they ensure that we throw the most appropriate error message if when is called incorrectly.
        // the benefit of this complexity is exercised in the test suite.
        var argArray = Array.prototype.slice.call(arguments, 0),
            lastIndex = argArray.length - 1,
            firstArgIsVariant = typeof argArray[0] !== 'function' && argArray.length > 0,
            variants = firstArgIsVariant ? argArray.slice(0, Math.max(1, lastIndex)): [],
            handler = argArray[lastIndex];

        if (variants.length === 0) {
            throw new Error('must provide at least one variant');
        }

        for (var i = 0; i < variants.length; i++) {
            this._assignHandlerToVariant(variants[i], handler);
        }
    };

    _VaryDSL.prototype.default = function(variant, handler) {
        if (this._defaultVariant) {
            throw new Error('must provide exactly one `default`');
        }

        this._defaultVariant = this._assignHandlerToVariant(variant, handler);
    };

    _VaryDSL.prototype.run = function() {
        this._validate();

        var chosenHandler;
        if (this._variantHandlers[this._assignment.getVariant()]) {
            chosenHandler = this._variantHandlers[this._assignment.getVariant()];
        } else {
            chosenHandler = this._variantHandlers[this.getDefaultVariant()];
            this._defaulted = true;
        }

        chosenHandler();
    };

    _VaryDSL.prototype.isDefaulted = function() {
        return this._defaulted || false;
    };

    _VaryDSL.prototype.getDefaultVariant = function() {
        return this._defaultVariant;
    };

    // private

    _VaryDSL.prototype._assignHandlerToVariant = function(variant, handler) {
        if (typeof handler !== 'function') {
            throw new Error('must provide handler for ' + variant);
        }

        variant = variant.toString();

        if (this._getSplit() && !this._getSplit().hasOwnProperty(variant)) {
            this._visitor.logError('configures unknown variant ' + variant);
        }

        this._variantHandlers[variant] = handler;

        return variant;
    };

    _VaryDSL.prototype._validate = function() {
        if (!this.getDefaultVariant()) {
            throw new Error('must provide exactly one `default`');
        } else if (this._getVariants().length < 2) {
            throw new Error('must provide at least one `when`');
        } else if (!this._getSplit()) {
            return;
        }

        var missingVariants = this._getMissingVariants();

        if (missingVariants.length > 0) {
            var missingVariantSentence = missingVariants.join(', ').replace(/, (.+)$/, ' and $1');
            this._visitor.logError('does not configure variants ' + missingVariantSentence);
        }
    };

    _VaryDSL.prototype._getSplit = function() {
        if (this._splitRegistry) {
            return this._splitRegistry[this._assignment.getSplitName()];
        } else {
            return null;
        }
    };

    _VaryDSL.prototype._getVariants = function() {
        return Object.getOwnPropertyNames(this._variantHandlers);
    };

    _VaryDSL.prototype._getMissingVariants = function() {
        var variants = this._getVariants(),
            split = this._getSplit(),
            splitVariants = Object.getOwnPropertyNames(split),
            missingVariants = [];

        for (var i = 0; i < splitVariants.length; i++) {
            var splitVariant = splitVariants[i];

            if (variants.indexOf(splitVariant) === -1) {
                missingVariants.push(splitVariant);
            }
        }

        return missingVariants;
    };

    return _VaryDSL;
})();
