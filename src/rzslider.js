/**
 * Angular JS slider directive
 *
 * (c) Rafal Zajac <rzajac@gmail.com>
 * http://github.com/rzajac/angularjs-slider
 *
 * Version: v1.1.0
 *
 * Licensed under the MIT license
 */

/*jslint unparam: true */
/*global angular: false, console: false, define, module */
(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['angular'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    // to support bundler like browserify
    module.exports = factory(require('angular'));
  } else {
    // Browser globals (root is window)
    factory(root.angular);
  }

}(this, function (angular) {
  'use strict';
var module = angular.module('rzModule', [])

.value('throttle',
  /**
   * throttle
   *
   * Taken from underscore project
   *
   * @param {Function} func
   * @param {number} wait
   * @param {ThrottleOptions} options
   * @returns {Function}
   */
function throttle(func, wait, options) {
  'use strict';
  var getTime = (Date.now || function() {
    return new Date().getTime();
  });
  var context, args, result;
  var timeout = null;
  var previous = 0;
  options = options || {};
  var later = function() {
    previous = options.leading === false ? 0 : getTime();
    timeout = null;
    result = func.apply(context, args);
    context = args = null;
  };
  return function() {
    var now = getTime();
    if (!previous && options.leading === false) { previous = now; }
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0) {
      clearTimeout(timeout);
      timeout = null;
      previous = now;
      result = func.apply(context, args);
      context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
})

.factory('RzSlider', function($timeout, $document, $window, throttle)
{
  'use strict';

  /**
   * Slider
   *
   * @param {ngScope} scope            The AngularJS scope
   * @param {Element} sliderElem The slider directive element wrapped in jqLite
   * @param {*} attributes       The slider directive attributes
   * @constructor
   */
  var Slider = function(scope, sliderElem, attributes)
  {
    /**
     * The slider's scope
     *
     * @type {ngScope}
     */
    this.scope = scope;

    /**
     * The slider attributes
     *
     * @type {Object}
     */
    this.attributes = attributes;

    /**
     * Slider element wrapped in jqLite
     *
     * @type {jqLite}
     */
    this.sliderElem = sliderElem;

    /**
     * Slider type
     *
     * @type {boolean} Set to true for range slider
     */
    this.range = attributes.rzSliderHigh !== undefined && attributes.rzSliderModel !== undefined;

    /**
     * Slider type. Multiple sliders
     *
     * @type {boolean} Set to true for multiple range slider
     */
    this.multipleRange = attributes.rzSliderMiddle !== undefined && attributes.rzSliderHigh !== undefined && attributes.rzSliderModel !== undefined;

    /**
     * Whether to allow draggable range
     *
     * @type {boolean} Set to true for draggable range slider
     */
    this.dragRange = this.range && attributes.rzSliderDraggableRange === 'true';
    if (attributes.rzSliderDraggableRange === 'true' && this.multipleRange){
      throw new Error('Not implemented')
    }

    /**
     * Values recorded when first dragging the bar
     *
     * @type {Object}
     */
    this.dragging = {
      active: false,
      value: 0,
      difference: 0,
      offset: 0,
      lowDist: 0,
      highDist: 0
    };

    /**
     * Half of the width of the slider handles
     *
     * @type {number}
     */
    this.handleHalfWidth = 0;

    /**
     * Always show selection bar
     *
     * @type {boolean}
     */
    this.alwaysShowBar = !!attributes.rzSliderAlwaysShowBar;

    /**
     * Maximum left the slider handle can have
     *
     * @type {number}
     */
    this.maxLeft = 0;

    /**
     * Precision
     *
     * @type {number}
     */
    this.precision = 0;

    /**
     * Step
     *
     * @type {number}
     */
    this.step = 0;

    /**
     * The name of the handle we are currently tracking
     *
     * @type {string}
     */
    this.tracking = '';

    /**
     * The index of the tracked handled in case it is a middle handle
     *
     * @type {number}
     */
    this.middleTrackingIndex = 0;
    /**
     * Minimum value (floor) of the model
     *
     * @type {number}
     */
    this.minValue = 0;

    /**
     * Maximum value (ceiling) of the model
     *
     * @type {number}
     */
    this.maxValue = 0;

    /**
     * Hide limit labels
     *
     * @type {boolean}
     */
    this.hideLimitLabels = !!attributes.rzSliderHideLimitLabels;

    /**
     * Hide pointer labels
     *
     * @type {boolean}
     */
    this.hidePointerLabels = !!attributes.rzSliderHidePointerLabels;

    /**
     * Only present model values
     *
     * Do not allow to change values
     *
     * @type {boolean}
     */
    this.presentOnly = attributes.rzSliderPresentOnly === 'true';

    /**
     * Display ticks.
     *
     * @type {boolean|Number} if Number then the ticks step value
     */
    this.showTicks = attributes.rzSliderShowTicks || attributes.rzSliderShowTicksValue;

    /**
     * Display the value on each tick.
     *
     * @type {boolean}
     */
    this.showTicksValue = attributes.rzSliderShowTicksValue;

    /**
     *  Legend to show
     * @type {string}
     */
    this.rzSliderLegend = attributes.rzSliderLegend;

    /**
     * Disable the slider
     *
     * @type {boolean}
     */
    this.disabled = this.scope.rzSliderDisabled;

    /**
     * The interval at which the slider updates when the model/high values
     * are altered from outside the slider
     *
     * @type {number}
     */
    this.interval = this.scope.rzSliderInterval !== null ? this.scope.rzSliderInterval : 350;

    /**
     * Hide cmbLabel and show actual value on click. Useful for middle values
     */
    this.activeLabel = this.scope.rzSliderActiveLabel === 'true';

    /**
     * The delta between min and max value
     *
     * @type {number}
     */
    this.valueRange = 0;

    /**
     * Set to true if init method already executed
     *
     * @type {boolean}
     */
    this.initHasRun = false;

    /**
     * Custom translate function
     *
     * @type {function}
     */
    this.customTrFn = this.scope.rzSliderTranslate() || function(value) { return String(value); };

    /**
     * Array of de-registration functions to call on $destroy
     *
     * @type {Array.<Function>}
     */
    this.deRegFuncs = [];

    // Slider DOM elements wrapped in jqLite
    this.fullBar = null;  // The whole slider bar
    this.selBar = null;   // Highlight between two handles
    this.minH = null;     // Left slider handle
    this.maxH = null;     // Right slider handle
    this.flrLab = null;   // Floor label
    this.ceilLab = null;  // Ceiling label
    this.minLab =  null;  // Label above the low value
    this.maxLab = null;   // Label above the high value
    this.cmbLab = null;   // Combined label
    this.ticks = null;  // The ticks
    this.legend = null; //The legend
    this.middleH = null; //middle handle group
    this.middleBar = null //middle bar group
    // Initialize slider
    this.init();
  };

  // Add instance methods
  Slider.prototype = {

    /**
     * Initialize slider
     *
     * @returns {undefined}
     */
    init: function()
    {
      var thrLow, thrHigh, thrMiddle, unRegFn,
        calcDimFn = angular.bind(this, this.calcViewDimensions),
        self = this;

      this.initElemHandles();
      this.addAccessibility();
      this.setDisabledState();
      this.calcViewDimensions();
      this.setMinAndMax();

      this.precision = this.scope.rzSliderPrecision === undefined ? 0 : +this.scope.rzSliderPrecision;
      this.step = this.scope.rzSliderStep === undefined ? 1 : +this.scope.rzSliderStep;

      $timeout(function()
      {
        self.updateCeilLab();
        self.updateFloorLab();
        self.initHandles();
        self.bindEvents();
      });

      // Recalculate slider view dimensions
      unRegFn = this.scope.$on('reCalcViewDimensions', calcDimFn);
      this.deRegFuncs.push(unRegFn);

      // Recalculate stuff if view port dimensions have changed
      angular.element($window).on('resize', calcDimFn);

      this.initHasRun = true;

      // Watch for changes to the model

      thrLow = throttle(function()
      {
        self.setMinAndMax();
        self.updateLowHandle(self.valueToOffset(self.scope.rzSliderModel));
        self.updateSelectionBar();
        self.updateTicksScale();
        self.updateLegend();
        if(self.range)
        {
          self.updateCmbLabel();
        }
        if(self.multipleRange)
        {
          self.updateMiddleSelectionBars();
        }

      }, self.interval);

      //TODO thrMiddle

      thrMiddle = throttle(function()
      {
        self.setMinAndMax();
        self.updateMiddleHandles(self.valuesToOffset(self.scope.rzSliderMiddle));
        self.updateSelectionBar();
        self.updateTicksScale();
        self.updateLegend();
        self.updateCmbLabel();
        self.updateMiddleSelectionBars();

      }, self.interval)
      thrHigh = throttle(function()
      {
        self.setMinAndMax();
        self.updateHighHandle(self.valueToOffset(self.scope.rzSliderHigh));
        self.updateSelectionBar();
        self.updateTicksScale();
        self.updateLegend();
        self.updateCmbLabel();
        if(self.multipleRange)
        {
          self.updateMiddleSelectionBars();
        }
      }, self.interval);

      this.scope.$on('rzSliderForceRender', function()
      {
        self.resetLabelsValue();
        thrLow();
        if(self.range) { thrHigh(); }
        if(self.multipleRange) {thrMiddle();}
        self.resetSlider();
      });

      // Watchers

      unRegFn = this.scope.$watch('rzSliderModel', function(newValue, oldValue)
      {
        if(newValue === oldValue) { return; }
        thrLow();
      });
      this.deRegFuncs.push(unRegFn);

      unRegFn = this.scope.$watch('rzSliderMiddle', function(newValue, oldValue)
      {
        if(_.isEqual(newValue, oldValue)) {return ;}
        thrMiddle();
      }, true);
      this.deRegFuncs.push(unRegFn);

      unRegFn = this.scope.$watch('rzSliderHigh', function(newValue, oldValue)
      {
        if(newValue === oldValue) { return; }
        thrHigh();
      });
      this.deRegFuncs.push(unRegFn);

      this.scope.$watch('rzSliderFloor', function(newValue, oldValue)
      {
        if(newValue === oldValue) { return; }
        self.resetSlider();
      });
      this.deRegFuncs.push(unRegFn);

      unRegFn = this.scope.$watch('rzSliderCeil', function(newValue, oldValue)
      {
        if(newValue === oldValue) { return; }
        self.resetSlider();
      });
      this.deRegFuncs.push(unRegFn);

      unRegFn = this.scope.$watch('rzSliderShowTicks', function(newValue, oldValue)
      {
        if(newValue === oldValue) { return; }
        self.resetSlider();
      });
      this.deRegFuncs.push(unRegFn);

      unRegFn = this.scope.$watch('rzSliderShowTicksValue', function(newValue, oldValue)
      {
        if(newValue === oldValue) { return; }
        self.resetSlider();
      });
      this.deRegFuncs.push(unRegFn);

      unRegFn = this.scope.$watch('rzSliderDisabled', function(newValue, oldValue)
      {
        if(newValue === oldValue) { return; }
        self.resetSlider();
        if(self.disabled)
          self.unbindEvents();
        else
          self.bindEvents();
      });
      this.deRegFuncs.push(unRegFn);

      this.scope.$on('$destroy', function()
      {
        self.unbindEvents();
        angular.element($window).off('resize', calcDimFn);
        self.deRegFuncs.map(function(unbind) { unbind(); });
      });
    },

    /**
     * Resets slider
     *
     * @returns {undefined}
     */
    resetSlider: function()
    {
      this.setMinAndMax();
      //TODO do middle
      this.updateCeilLab();
      this.updateFloorLab();
      this.setDisabledState();
      this.calcViewDimensions();
    },

    /**
     * Set the disabled state based on rzSliderDisabled
     *
     * @returns {undefined}
     */
    setDisabledState: function()
    {
      this.disabled = this.scope.rzSliderDisabled;
      if(this.disabled) {
        this.sliderElem.attr('disabled', 'disabled');
      }
      else {
        this.sliderElem.attr('disabled', null);
      }

    },

    /**
     * Reset label values
     *
     * @return {undefined}
     */
    resetLabelsValue: function()
    {
      this.minLab.rzsv = undefined;
      this.maxLab.rzsv = undefined;
    },

    /**
     * Initialize slider handles positions and labels
     *
     * Run only once during initialization and every time view port changes size
     *
     * @returns {undefined}
     */
    initHandles: function()
    {
      this.updateLowHandle(this.valueToOffset(this.scope.rzSliderModel));

      /*
      the order here is important since the selection bar should be
      updated after the high handle but before the combined label
       */
      if(this.range)
        this.updateHighHandle(this.valueToOffset(this.scope.rzSliderHigh));
      this.updateSelectionBar();
      if(this.range)
        this.updateCmbLabel();

      if(this.multipleRange)
        this.updateMiddleHandles(this.valuesToOffset(this.scope.rzSliderMiddle))
      this.updateTicksScale();
      if(this.multipleRange)
        this.updateMiddleSelectionBars();
      this.updateLegend();
    },

    /**
     * Translate value to human readable format
     *
     * @param {number|string} value
     * @param {jqLite} label
     * @param {boolean} [useCustomTr]
     * @returns {undefined}
     */
    translateFn: function(value, label, useCustomTr)
    {
      useCustomTr = useCustomTr === undefined ? true : useCustomTr;

      var valStr = (useCustomTr ? this.customTrFn(value) : value).toString(),
          getWidth = false;

      if(label.rzsv === undefined || label.rzsv.length !== valStr.length || (label.rzsv.length > 0 && label.rzsw === 0))
      {
        getWidth = true;
        label.rzsv = valStr;
      }

      label.text(valStr);

      // Update width only when length of the label have changed
      if(getWidth) { this.getWidth(label); }
    },

    /**
     * Set maximum and minimum values for the slider
     *
     * @returns {undefined}
     */
    setMinAndMax: function()
    {
      if(this.scope.rzSliderFloor)
      {
        this.minValue = +this.scope.rzSliderFloor;
      }
      else
      {
        this.minValue = this.scope.rzSliderFloor = 0;
      }

      if(this.scope.rzSliderCeil)
      {
        this.maxValue = +this.scope.rzSliderCeil;
      }
      else
      {
        this.maxValue = this.scope.rzSliderCeil = this.range ? this.scope.rzSliderHigh : this.scope.rzSliderModel;
      }

      if(this.scope.rzSliderStep)
      {
        this.step = +this.scope.rzSliderStep;
      }

      this.valueRange = this.maxValue - this.minValue;
    },

    //TODO setMiddle

    /**
     * Set the slider children to variables for easy access
     *
     * Run only once during initialization
     *
     * @returns {undefined}
     */
    initElemHandles: function()
    {
      // Assign all slider elements to object properties for easy access
      angular.forEach(this.sliderElem.children(), function(elem, index)
      {
        var jElem = angular.element(elem);

        switch(index)
        {
          case 0: this.fullBar = jElem; break;
          case 1: this.selBar = jElem; break;
          case 2: this.minH = jElem; break;
          case 3: this.maxH = jElem; break;
          case 4: this.flrLab = jElem; break;
          case 5: this.ceilLab = jElem; break;
          case 6: this.minLab = jElem; break;
          case 7: this.maxLab = jElem; break;
          case 8: this.cmbLab = jElem; break;
          case 9: this.ticks = jElem; break;
          case 10 : this.legend = jElem; break;
          case 11 : this.middleH = jElem; break;
          case 12 : this.middleBar = jElem; break;
          case 13 : this.activeLab = jElem; break;
        }

      }, this);
      this.middleHs = []; //middleHs as angular elements
      this.middleBars = [];//middleBars as angular elements

      // Initialize offset cache properties
      this.selBar.rzsl = 0;
      this.minH.rzsl = 0;
      this.maxH.rzsl = 0;
      this.flrLab.rzsl = 0;
      this.ceilLab.rzsl = 0;
      this.minLab.rzsl = 0;
      this.maxLab.rzsl = 0;
      this.cmbLab.rzsl = 0;
      this.middleH.rzsl = [];
      this.activeLab.rzsl = 0;

      // Hide limit labels
      if(this.hideLimitLabels)
      {
        this.flrLab.rzAlwaysHide = true;
        this.ceilLab.rzAlwaysHide = true;
        this.hideEl(this.flrLab);
        this.hideEl(this.ceilLab);
      }

      // Hide pointer labels
      if(this.hidePointerLabels)
      {
        this.minLab.rzAlwaysHide = true;
        this.maxLab.rzAlwaysHide = true;
        this.cmbLab.rzAlwaysHide = true;
        this.hideEl(this.minLab);
        this.hideEl(this.maxLab);
        this.hideEl(this.cmbLab);
      }

      // Remove stuff not needed in single slider
      if(this.range === false)
      {
        this.cmbLab.remove();
        this.maxLab.remove();

        // Hide max handle
        this.maxH.rzAlwaysHide = true;
        this.maxH[0].style.zIndex = '-1000';
        this.hideEl(this.maxH);
      }

      //Show long bar in multiple range
      if(this.range && this.multipleRange)
      {
        this.selBar.remove()
      }
      // Show selection bar for single slider or not
      if(this.range === false && this.alwaysShowBar === false)
      {
        this.maxH.remove();
        this.selBar.remove();
      }

      //Remove middle elements and bars for single slider
      if(!this.multipleRange)
      {
        this.middleH.remove();
        this.middleBar.remove();
      }

      //Remove active label if not needed
      if(!this.activeLabel)
      {
        this.activeLab.remove();
      }
      // If using draggable range, use appropriate cursor for this.selBar.
      if (this.dragRange)
      {
        this.selBar.css('cursor', 'move');
        this.selBar.addClass('rz-draggable');
      }
    },

    /**
     * Adds accessibility atributes
     *
     * Run only once during initialization
     *
     * @returns {undefined}
     */
    addAccessibility: function ()
    {
      this.sliderElem.attr("role", "slider");
    },

    /**
     * Calculate dimensions that are dependent on view port size
     *
     * Run once during initialization and every time view port changes size.
     *
     * @returns {undefined}
     */
    calcViewDimensions: function ()
    {
      var handleWidth = this.getWidth(this.minH);

      this.handleHalfWidth = handleWidth / 2;
      this.barWidth = this.getWidth(this.fullBar);

      this.maxLeft = this.barWidth - handleWidth;

      this.getWidth(this.sliderElem);
      this.sliderElem.rzsl = this.sliderElem[0].getBoundingClientRect().left;

      if(this.initHasRun)
      {
        this.updateFloorLab();
        this.updateCeilLab();
        this.initHandles();
      }
    },

    /**
     * Update the ticks position
     *
     * @returns {undefined}
     */
    updateTicksScale: function() {
      if(!this.showTicks) return;
      if(!this.step) return; //if step is 0, the following loop will be endless.
      var step = this.step;
      if(parseInt(this.showTicks) == this.showTicks){step = this.showTicks};
      var positions = '',
          ticksCount = Math.round((this.maxValue - this.minValue) / step) + 1;
      for (var i = 0; i < ticksCount; i++) {
        var value = this.roundStep(this.minValue + i * step);
        var selectedClass = this.isTickSelected(value) ? 'selected': '';
        positions += '<li class="tick '+ selectedClass +'">';
        if(this.showTicksValue)
          positions += '<span class="tick-value">'+ this.getDisplayValue(value) +'</span>';
        positions += '</li>';
      }
      this.ticks.html(positions);
    },

    isTickSelected: function(value) {
      var tickLeft = this.valueToOffset(value);
      if(!this.range && this.alwaysShowBar && value <= this.scope.rzSliderModel)
        return true;
      if(this.range && value >= this.scope.rzSliderModel && value <= this.scope.rzSliderHigh)
        return true;
      return false;
    },
    /**
     * Update legend
     */
    updateLegend : function (){
      if(!this.rzSliderLegend) return;
      this.legend.text(this.rzSliderLegend)
    },
    /**
     * Update position of the ceiling label
     *
     * @returns {undefined}
     */
    updateCeilLab: function()
    {
      this.translateFn(this.scope.rzSliderCeil, this.ceilLab);
      this.setLeft(this.ceilLab, this.barWidth - this.ceilLab.rzsw);
      this.getWidth(this.ceilLab);
    },

    /**
     * Update position of the floor label
     *
     * @returns {undefined}
     */
    updateFloorLab: function()
    {
      this.translateFn(this.scope.rzSliderFloor, this.flrLab);
      this.getWidth(this.flrLab);
    },

    /**
     * Call the onStart callback if defined
     *
     * @returns {undefined}
     */
    callOnStart: function() {
      if(this.scope.rzSliderOnStart) {
        var self = this;
        $timeout(function() {
            self.scope.rzSliderOnStart();
        });
      }
    },

    /**
     * Call the onChange callback if defined
     *
     * @returns {undefined}
     */
    callOnChange: function() {
      if(this.scope.rzSliderOnChange) {
        var self = this;
        $timeout(function() {
            self.scope.rzSliderOnChange();
        });
      }
    },

    /**
     * Call the onEnd callback if defined
     *
     * @returns {undefined}
     */
    callOnEnd: function() {
      if(this.scope.rzSliderOnEnd) {
        var self = this;
        $timeout(function() {
            self.scope.rzSliderOnEnd();
        });
      }
    },

    /**
     * Update slider handles and label positions
     *
     * @param {string} which
     * @param {number | Array<number>} newOffset (newOffsets for rzSliderMiddle)
     */
    updateHandles: function(which, newOffset, newValue)
    {
      if(which === 'rzSliderModel')
      {
        this.updateLowHandle(newOffset);
        this.updateSelectionBar();
        this.updateTicksScale();

        if(this.range)
        {
          this.updateCmbLabel();
        }
        if(this.multipleRange)
        {
          this.updateMiddleSelectionBars()
        }
        return;
      }

      if(which === 'rzSliderHigh')
      {

        this.updateHighHandle(newOffset);
        this.updateSelectionBar();
        this.updateTicksScale();

        if(this.range)
        {
          this.updateCmbLabel();
        }
        if(this.multipleRange)
        {
          this.updateMiddleSelectionBars()
        }
        return;
      }

      if(which === 'rzSliderMiddle')
      {
        this.updateTicksScale();
        this.updateCmbLabel();
        this.updateMiddleSelectionBars()
          return;
      }

      // Update both
      this.updateLowHandle(newOffset);
      this.updateHighHandle(newOffset);
      this.updateSelectionBar();
      this.updateTicksScale();
      this.updateCmbLabel();
      if(this.multipleRange)
        this.updateMiddleSelectionBars()
      this.updateLegend();
    },

    /**
     * Update low slider handle position and label
     *
     * @param {number} newOffset
     * @returns {undefined}
     */
    updateLowHandle: function(newOffset)
    {
      this.setLeft(this.minH, newOffset);
      this.translateFn(this.scope.rzSliderModel, this.minLab);
      this.setLeft(this.minLab, newOffset - this.minLab.rzsw / 2 + this.handleHalfWidth);

      this.shFloorCeil();
    },

    /**
     * Update middle handlers position and labels
     * @param {Array.<number>} newOffsets
     * @returns {undefined}
     */
    updateMiddleHandles: function(newOffsets)
    {
      //TODO Check we treat the case when middle length changes
      var handlers = this.middleHs;
      for (var i = 0; i < newOffsets.length; i ++) {
        //TODO WARNING this assumes that sortedHandlers[i] has index i. Make sure it is the case
        var middle = handlers[i];
        var isPrecomputed = !!middle;
        //We set index to access the handler later
        middle = isPrecomputed ? middle : angular.element(('<span class="rz-pointer rz-middle-' + i + '" index="'+ i + '"></span>'));
        this.setLeft(middle, newOffsets[i])
        if (!isPrecomputed)
        {
          this.middleH.append(middle)
          middle.on('mousedown', angular.bind(this, this.onStart, middle, 'rzSliderMiddle'));
          middle.on('touchstart', angular.bind(this, this.onStart, middle, 'rzSliderMiddle'));
        }
        middle.index = i;
        this.middleHs[i] = middle;
      };
      //Remove deleted nodes from the model
      for (var i = newOffsets.length; i < this.middleHs.length; i++) {
        this.middleHs[i].off();
        this.middleHs[i].remove();
      }
      if (newOffsets.length < this.middleHs.length)
        this.middleHs = this.middleHs.slice(0, newOffsets.length)
    },



    /**
     * Update high slider handle position and label
     *
     * @param {number} newOffset
     * @returns {undefined}
     */
    updateHighHandle: function(newOffset)
    {
      this.setLeft(this.maxH, newOffset);
      this.translateFn(this.scope.rzSliderHigh, this.maxLab);
      this.setLeft(this.maxLab, newOffset - this.maxLab.rzsw / 2 + this.handleHalfWidth);

      this.shFloorCeil();
    },

    /**
     * Show / hide floor / ceiling label
     *
     * @returns {undefined}
     */
    shFloorCeil: function()
    {
      var flHidden = false, clHidden = false;

      if(this.minLab.rzsl <= this.flrLab.rzsl + this.flrLab.rzsw + 5)
      {
        flHidden = true;
        this.hideEl(this.flrLab);
      }
      else
      {
        flHidden = false;
        this.showEl(this.flrLab);
      }

      if(this.minLab.rzsl + this.minLab.rzsw >= this.ceilLab.rzsl - this.handleHalfWidth - 10)
      {
        clHidden = true;
        this.hideEl(this.ceilLab);
      }
      else
      {
        clHidden = false;
        this.showEl(this.ceilLab);
      }

      if(this.range)
      {
        if(this.maxLab.rzsl + this.maxLab.rzsw >= this.ceilLab.rzsl - 10)
        {
          this.hideEl(this.ceilLab);
        }
        else if( ! clHidden)
        {
          this.showEl(this.ceilLab);
        }

        // Hide or show floor label
        if(this.maxLab.rzsl <= this.flrLab.rzsl + this.flrLab.rzsw + this.handleHalfWidth)
        {
          this.hideEl(this.flrLab);
        }
        else if( ! flHidden)
        {
          this.showEl(this.flrLab);
        }
      }

      //TODO multirange
    },

    /**
     * Update slider selection bar, combined label and range label
     *
     * @returns {undefined}
     */
    updateSelectionBar: function()
    {
      this.setWidth(this.selBar, Math.abs(this.maxH.rzsl - this.minH.rzsl) + this.handleHalfWidth);
      this.setLeft(this.selBar, this.range ? this.minH.rzsl + this.handleHalfWidth : 0);
    },

    /**
     * Update middle slider selection bars
     */
    updateMiddleSelectionBars: function()
    {
      var self = this;
      //TODO Check we treat the case when middle length changes
      var selectionBars = this.middleBars;
      //this.scope.rzSlider.length + 1 because there is one more handle than middle points
        for (var i = 0; i < this.scope.rzSliderMiddle.length + 1; i++) {
          //TODO WARNING this assumes that sortedSelectionBars[i] has index i. Make sure it is the case
          var middleBar = selectionBars[i];
          var isPrecomputed = !!middleBar;
          middleBar = isPrecomputed ? middleBar : angular.element(('<span class="rz-bar-wrapper rz-middle-bar-' + i + '" "index"="' + i + '"><span class="rz-bar rz-selection"></span></span>'));
          this.setWidth(middleBar, Math.abs(getHandleRzsl(i) - getHandleRzsl(i-1)) + this.handleHalfWidth);
          this.setLeft(middleBar, this.multipleRange ? getHandleRzsl(i-1) : 0);
          if (!isPrecomputed)
          {
            this.middleBar.append(middleBar)
            middleBar.on('mousedown', angular.bind(this, this.onStart, null, null))
            middleBar.on('mousedown', angular.bind(this, this.onMove, middleBar));
            middleBar.on('touchstart', angular.bind(this, this.onStart, null, null))
            middleBar.on('touchstart', angular.bind(this, this.onMove, middleBar));
          }
          this.middleBars[i] = middleBar;
        }
      //Remove deleted nodes from the model
      for (var i = this.scope.rzSliderMiddle.length + 1; i < this.middleBars.length; i++) {
        this.middleBars[i].off();
        this.middleBars[i].remove();
      }
      if (this.scope.rzSliderMiddle.length + 1 < this.middleBars.length)
        this.middleBars = this.middleBars.slice(0, this.scope.rzSliderMiddle.length + 1)

      function getHandleRzsl(index) {
        switch (index) {
          case -1 : return self.minH.rzsl;
          case self.scope.rzSliderMiddle.length : return self.maxH.rzsl;
          default : return self.middleHs[index].rzsl
        }
      }
    },

    /**
     * Update combined label position and value
     *
     * @returns {undefined}
     */
    updateCmbLabel: function()
    {
      var lowTr, highTr;

      if(this.minLab.rzsl + this.minLab.rzsw + 10 >= this.maxLab.rzsl)
      {
        lowTr = this.getDisplayValue(this.scope.rzSliderModel);
        highTr = this.getDisplayValue(this.scope.rzSliderHigh);
        //TODO middle
        this.translateFn(lowTr + ' - ' + highTr, this.cmbLab, false);
        this.setLeft(this.cmbLab, this.selBar.rzsl + this.selBar.rzsw / 2 - this.cmbLab.rzsw / 2);
        this.hideEl(this.minLab);
        this.hideEl(this.maxLab);
        if (!this.activeLabel || this.tracking === '')
        {
          this.showEl(this.cmbLab);
        }  else
        {
          this.hideEl(this.cmbLab)
        }
      }
      else
      {
        if (!this.activeLabel || this.tracking === '')
        {
          this.showEl(this.maxLab);
          this.showEl(this.minLab);
        }
        else
        {
          this.hideEl(this.maxLab);
          this.hideEl(this.minLab);
        }
        this.hideEl(this.cmbLab);
      }
    },

    /**Update active label during movement
     * @params value
     * @returns {undefined}
     */
    updateActiveLabel: function(value, newOffset)
    {
      if(this.tracking === '')
      {
        this.hideEl(this.activeLab);
      }
      else
      {
        this.translateFn(value, this.activeLab);
        this.setLeft(this.activeLab, newOffset - this.activeLab.rzsw / 2 + this.handleHalfWidth);
        this.showEl(this.activeLab);
      }

    },
    /**
     * Return the translated value if a translate function is provided else the original value
     * @param value
     * @returns {*}
     */
    getDisplayValue: function(value) {
      return  this.customTrFn ? this.customTrFn(value): value;
    },

    /**
     * Round value to step and precision
     *
     * @param {number} value
     * @returns {number}
     */
    roundStep: function(value)
    {
      var step = this.step,
          remainder = +((value - this.minValue) % step).toFixed(3),
          steppedValue = remainder > (step / 2) ? value + step - remainder : value - remainder;

      steppedValue = steppedValue.toFixed(this.precision);
      return +steppedValue;
    },

    /**
     * Hide element
     *
     * @param element
     * @returns {jqLite} The jqLite wrapped DOM element
     */
    hideEl: function (element)
    {
      return element.css({opacity: 0});
    },

    /**
     * Show element
     *
     * @param element The jqLite wrapped DOM element
     * @returns {jqLite} The jqLite
     */
    showEl: function (element)
    {
      if(!!element.rzAlwaysHide) { return element; }

      return element.css({opacity: 1});
    },

    /**
     * Set element left offset
     *
     * @param {jqLite} elem The jqLite wrapped DOM element
     * @param {number} left
     * @returns {number}
     */
    setLeft: function (elem, left)
    {
      elem.rzsl = left;
      elem.css({left: left + 'px'});
      return left;
    },

    /**
     * Get element width
     *
     * @param {jqLite} elem The jqLite wrapped DOM element
     * @returns {number}
     */
    getWidth: function(elem)
    {
      var val = elem[0].getBoundingClientRect();
      elem.rzsw = val.right - val.left;
      return elem.rzsw;
    },

    /**
     * Set element width
     *
     * @param {jqLite} elem  The jqLite wrapped DOM element
     * @param {number} width
     * @returns {number}
     */
    setWidth: function(elem, width)
    {
      elem.rzsw = width;
      elem.css({width: width + 'px'});
      return width;
    },

    /**
     * Translate value to pixel offset
     *
     * @param {number} val
     * @returns {number}
     */
    valueToOffset: function(val)
    {
      return (val - this.minValue) * this.maxLeft / this.valueRange || 0;
    },

    /**
     * Translate values to pixel offset
     * @param {Array.<number>} vals
     * @returns {Array.<number>}
     */
    valuesToOffset: function(vals)
    {
      var self = this;
      return _.map(vals, function(item) {
        return self.valueToOffset(item)
      })
    },
    /**
     * Translate array to pixel offset
     * $param {array} middles
     * $returns {array}
     */

    /**
     * Translate offset to model value
     *
     * @param {number} offset
     * @returns {number}
     */
    offsetToValue: function(offset)
    {
      return (offset / this.maxLeft) * this.valueRange + this.minValue;
    },

    // Events

    /**
     * Get the X-coordinate of an event
     *
     * @param {Object} event  The event
     * @returns {number}
     */
    getEventX: function(event)
    {
      /* http://stackoverflow.com/a/12336075/282882 */
      //noinspection JSLint
      if('clientX' in event)
      {
        return event.clientX;
      }

      return event.originalEvent === undefined ?
          event.touches[0].clientX
          : event.originalEvent.touches[0].clientX;
    },

    /**
     * Get the handle closest to an event.
     *
     * @param event {Event} The event
     * @returns {jqLite} The handle closest to the event.
     */
    getNearestHandle: function(event)
    {
      if (!this.range) { return this.minH; }
      var offset = this.getEventX(event) - this.sliderElem.rzsl - this.handleHalfWidth;
      if (!this.multipleRange)
      {
        return Math.abs(offset - this.minH.rzsl) < Math.abs(offset - this.maxH.rzsl) ? this.minH : this.maxH;
      }
      var closestMiddle = _.minBy(this.middleHs, function (item) {return Math.abs(offset - item.rzsl)})
      var minHDistance = Math.abs(offset - this.minH.rzsl);
      var maxHDistance =  Math.abs(offset - this.maxH.rzsl);
      var middleHDistance = Math.abs(offset - closestMiddle.rzsl)
      if (minHDistance < maxHDistance && minHDistance < middleHDistance)
        return this.minH;
      if (middleHDistance < minHDistance && middleHDistance < maxHDistance)
        return closestMiddle;
      return this.maxH;
    },

    /**
     * Bind mouse and touch events to slider handles
     *
     * @returns {undefined}
     */
    bindEvents: function()
    {
      if(this.presentOnly || this.disabled) return;
      var barTracking, barStart, barMove;

      if (this.dragRange)
      {
        barTracking = 'rzSliderDrag';
        barStart = this.onDragStart;
        barMove = this.onDragMove;
      }
      else
      {
        barTracking = 'rzSliderModel';
        barStart = this.onStart;
        barMove = this.onMove;
      }
      this.minH.on('mousedown', angular.bind(this, this.onStart, this.minH, 'rzSliderModel'));
      if(this.range) { this.maxH.on('mousedown', angular.bind(this, this.onStart, this.maxH, 'rzSliderHigh')); }
      this.fullBar.on('mousedown', angular.bind(this, this.onStart, null, null));
      this.fullBar.on('mousedown', angular.bind(this, this.onMove, this.fullBar));
      this.selBar.on('mousedown', angular.bind(this, barStart, null, barTracking));
      this.selBar.on('mousedown', angular.bind(this, barMove, this.selBar));
      this.ticks.on('mousedown', angular.bind(this, this.onStart, null, null));
      this.ticks.on('mousedown', angular.bind(this, this.onMove, this.ticks));

      //middleHs and middleBars are allowed to appear and disappear on Model changes. Therefore we cannot set the listeners here


      this.minH.on('touchstart', angular.bind(this, this.onStart, this.minH, 'rzSliderModel'));
      if(this.range) { this.maxH.on('touchstart', angular.bind(this, this.onStart, this.maxH, 'rzSliderHigh')); }
      this.fullBar.on('touchstart', angular.bind(this, this.onStart, null, null));
      this.fullBar.on('touchstart', angular.bind(this, this.onMove, this.fullBar));
      this.selBar.on('touchstart', angular.bind(this, barStart, null, barTracking));
      this.selBar.on('touchstart', angular.bind(this, barMove, this.selBar));
      this.ticks.on('touchstart', angular.bind(this, this.onStart, null, null));
      this.ticks.on('touchstart', angular.bind(this, this.onMove, this.ticks));

    },
    /**
     * Unbind mouse and touch events to slider handles
     *
     * @returns {undefined}
     */
    unbindEvents: function()
    {
      this.minH.off();
      this.maxH.off();
      this.fullBar.off();
      this.selBar.off();
      this.ticks.off();
      angular.forEach(this.middleHs, function(elem, index) {
        elem.off();
      }, this);
      angular.forEach(this.middleBars, function(elem, index) {
        elem.off();
      }, this);
    },

    /**
     * onStart event handler
     *
     * @param {?Object} pointer The jqLite wrapped DOM element; if null, the closest handle is used
     * @param {?string} ref     The name of the handle being changed; if null, the closest handle's value is modified
     * @param {Event}   event   The event
     * @returns {undefined}
     */
    onStart: function (pointer, ref, event)
    {
      var ehMove, ehEnd,
          eventNames = this.getEventNames(event);

      event.stopPropagation();
      event.preventDefault();

      if(this.tracking !== '') { return; }

      // We have to do this in case the HTML where the sliders are on
      // have been animated into view.
      this.calcViewDimensions();

      if(pointer)
      {
        this.tracking = ref;
        if (ref === 'rzSliderMiddle')
          this.middleTrackingIndex = pointer.index;
      }
      else
      {
        pointer = this.getNearestHandle(event);
        switch (pointer) {
          case this.minH: this.tracking = 'rzSliderModel'; break;
          case this.maxH: this.tracking = 'rzSliderHigh'; break;
          default : this.tracking = 'rzSliderMiddle'; this.middleTrackingIndex = pointer.index;
        }
      }

      pointer.addClass('rz-active');
      ehMove = angular.bind(this, this.dragging.active ? this.onDragMove : this.onMove, pointer);
      ehEnd = angular.bind(this, this.onEnd, ehMove);

      $document.on(eventNames.moveEvent, ehMove);
      $document.one(eventNames.endEvent, ehEnd);
      if(this.activeLabel)
      {
        var initialValue;
        switch(this.tracking)
        {
          case 'rzSliderModel' : initialValue = this.scope.rzSliderModel; break;
          case 'rzSliderHigh' : initialValue = this.scope.rzSliderHigh; break;
          default : initialValue = this.scope.rzSliderMiddle[this.middleTrackingIndex]; break;
        }
        this.updateActiveLabel(initialValue,pointer.rzsl);
        this.updateCmbLabel();
      }


      this.callOnStart();
    },

    /**
     * onMove event handler
     *
     * @param {jqLite} pointer
     * @param {Event}  event The event
     * @returns {undefined}
     */
    onMove: function (pointer, event)
    {
      var eventX = this.getEventX(event),
          sliderLO, newOffset, newValue;

      sliderLO = this.sliderElem.rzsl;
      newOffset = eventX - sliderLO - this.handleHalfWidth;

      if(newOffset <= 0)
      {
        if(pointer.rzsl === 0)
          return;
        newValue = this.minValue;
        newOffset = 0;
      }
      else if(newOffset >= this.maxLeft)
      {
        if(pointer.rzsl === this.maxLeft)
          return;
        newValue = this.maxValue;
        newOffset = this.maxLeft;
      }
      else {
        newValue = this.offsetToValue(newOffset);
        newValue = this.roundStep(newValue);
        newOffset = this.valueToOffset(newValue);
      }
      this.positionTrackingHandle(newValue, newOffset);
    },

    /**
     * onDragStart event handler
     *
     * Handles dragging of the middle bar.
     *
     * @param {Object} pointer The jqLite wrapped DOM element
     * @param {string} ref     One of the refLow, refHigh values
     * @param {Event}  event   The event
     * @returns {undefined}
     */
    onDragStart: function(pointer, ref, event)
    {
      var offset = this.getEventX(event) - this.sliderElem.rzsl - this.handleHalfWidth;
      this.dragging = {
        active: true,
        value: this.offsetToValue(offset),
        difference: this.scope.rzSliderHigh - this.scope.rzSliderModel,
        offset: offset,
        lowDist: offset - this.minH.rzsl,
        highDist: this.maxH.rzsl - offset
      };
      this.minH.addClass('rz-active');
      this.maxH.addClass('rz-active');

      this.onStart(pointer, ref, event);
    },

    /**
     * onDragMove event handler
     *
     * Handles dragging of the middle bar.
     *
     * @param {jqLite} pointer
     * @param {Event}  event The event
     * @returns {undefined}
     */
    onDragMove: function(pointer, event)
    {
      var newOffset = this.getEventX(event) - this.sliderElem.rzsl - this.handleHalfWidth,
          newMinOffset, newMaxOffset,
          newMinValue, newMaxValue;

      if (newOffset <= this.dragging.lowDist)
      {
        if (pointer.rzsl === this.dragging.lowDist) { return; }
        newMinValue = this.minValue;
        newMinOffset = 0;
        newMaxValue = this.dragging.difference;
        newMaxOffset = this.valueToOffset(newMaxValue);
      }
      else if (newOffset >= this.maxLeft - this.dragging.highDist)
      {
        if (pointer.rzsl === this.dragging.highDist) { return; }
        newMaxValue = this.maxValue;
        newMaxOffset = this.maxLeft;
        newMinValue = this.maxValue - this.dragging.difference;
        newMinOffset = this.valueToOffset(newMinValue);
      }
      else
      {
        newMinValue = this.offsetToValue(newOffset - this.dragging.lowDist);
        newMinValue = this.roundStep(newMinValue);
        newMinOffset = this.valueToOffset(newMinValue);
        newMaxValue = newMinValue + this.dragging.difference;
        newMaxOffset = this.valueToOffset(newMaxValue);
      }

      this.positionTrackingBar(newMinValue, newMaxValue, newMinOffset, newMaxOffset);
    },

    /**
     * Set the new value and offset for the entire bar
     *
     * @param {number} newMinValue   the new minimum value
     * @param {number} newMaxValue   the new maximum value
     * @param {number} newMinOffset  the new minimum offset
     * @param {number} newMaxOffset  the new maximum offset
     */
    positionTrackingBar: function(newMinValue, newMaxValue, newMinOffset, newMaxOffset)
    {
      this.scope.rzSliderModel = newMinValue;
      this.scope.rzSliderHigh = newMaxValue;
      this.updateHandles('rzSliderModel', newMinOffset);
      this.updateHandles('rzSliderHigh', newMaxOffset);
      this.scope.$apply();
      this.callOnChange();
    },

    /**
     * Set the new value and offset to the current tracking handle
     *
     * @param {number} newValue new model value
     * @param {number} newOffset new offset value
     */
    positionTrackingHandle: function(newValue, newOffset)
    {
      var self = this;
      if(this.range && !this.multipleRange)
      {
        /* This is to check if we need to switch the min and max handles*/
        if (this.tracking === 'rzSliderModel' && newValue >= this.scope.rzSliderHigh)
        {
          this.scope[this.tracking] = this.scope.rzSliderHigh;
          this.updateHandles(this.tracking, this.maxH.rzsl);
          this.tracking = 'rzSliderHigh';
          this.minH.removeClass('rz-active');
          this.maxH.addClass('rz-active');
           /* We need to apply here because we are not sure that we will enter the next block */
          if(this.activeLabel)
          {
            this.updateActiveLabel(newValue, newOffset)
          }
          this.scope.$apply();
          this.callOnChange();
        }
        else if(this.tracking === 'rzSliderHigh' && newValue <= this.scope.rzSliderModel)
        {
          this.scope[this.tracking] = this.scope.rzSliderModel;
          this.updateHandles(this.tracking, this.minH.rzsl);
          this.tracking = 'rzSliderModel';
          this.maxH.removeClass('rz-active');
          this.minH.addClass('rz-active');
           /* We need to apply here because we are not sure that we will enter the next block */
          this.scope.$apply();
          this.callOnChange();
        }
      }

      if(this.range && this.multipleRange)
      {
        var extendedIndex; //Here we track Model, Middles and High together
        switch (this.tracking) {
          case 'rzSliderModel' : extendedIndex = -1; break;
          case 'rzSliderHigh' : extendedIndex = this.scope.rzSliderMiddle.length; break;
          case 'rzSliderMiddle' : extendedIndex = this.middleTrackingIndex
        }
        //List is not longer in order
        if ((newValue < getValue(extendedIndex-1)) || (newValue > getValue(extendedIndex + 1)))
        {
          var newIndex = findIndex(newValue, extendedIndex);
          //Shift the rest of the properties
          shiftIndex(extendedIndex, newIndex);

          //We update everything so we don't have to distinguish cases
          this.updateHandles('rzSliderHigh', this.maxH.rzsl);
          this.updateHandles('rzSliderModel', this.minH.rzsl);
          //TODO do this right using newOffset
          this.updateHandles('rzSliderMiddle', this.valuesToOffset(this.scope.rzSliderMiddle))
          getHandler(extendedIndex).removeClass('rz-active');
          getHandler(newIndex).addClass('rz-active');
          if(this.activeLabel)
          {
            this.updateActiveLabel(newValue, newOffset)
          }

          this.tracking = getType(newIndex);
          this.middleTrackingIndex = newIndex;
          this.scope.$apply();
          this.callOnChange();

        }

      }

      if(this.tracking !== 'rzSliderMiddle' && this.scope[this.tracking] !== newValue)
      {
        this.scope[this.tracking] = newValue;
        this.updateHandles(this.tracking, newOffset);
        if(this.activeLabel)
        {
          this.updateActiveLabel(newValue, newOffset)
        }

        this.scope.$apply();
        this.callOnChange();
      }

      if(this.tracking === 'rzSliderMiddle' && this.scope[this.tracking][this.middleTrackingIndex] !== newValue)
      {
        this.middleHs[this.middleTrackingIndex].rzsl = newOffset;
        this.scope.rzSliderMiddle[this.middleTrackingIndex] = newValue;
        this.updateHandles(this.tracking, this.valuesToOffset(this.scope.rzSliderMiddle));
        if(this.activeLabel)
        {
          this.updateActiveLabel(newValue, newOffset)
        }

        this.scope.$apply();
        this.callOnChange();
      }


      function getHandler(index) {
        switch (index) {
          case -1 : return self.minH;
          case self.scope.rzSliderMiddle.length : return self.maxH;
          default :return self.middleHs[index];
        }
      };
      function getType(index) {
        switch (index) {
          case -1 : return'rzSliderModel';
          case self.scope.rzSliderMiddle.length : return 'rzSliderHigh';
          default :return 'rzSliderMiddle';
        }
      };
      function getValue(index) {
        switch (index) {
          case -2 : return Number.NEGATIVE_INFINITY; //we need this when comparing with rzSliderModel
          case -1 : return self.scope.rzSliderModel;
          case self.scope.rzSliderMiddle.length : return self.scope.rzSliderHigh;
          case self.scope.rzSliderMiddle.length + 1 : return Number.POSITIVE_INFINITY; //We need when comparing with rzSliderHigh
          default : return self.scope.rzSliderMiddle[index];
        }
      };
      function setValue(index, value){
        switch (index) {
          case -1 : self.scope.rzSliderModel = value; break;
          case self.scope.rzSliderMiddle.length : self.rzSliderHigh = value; break;
          default : self.scope.rzSliderMiddle[index] = value;
        }
      };
      //We find the correct place for the new Value
      function findIndex(value, oldIndex) {
        for (var i=-1; i < self.scope.rzSliderMiddle.length + 2; i++) {
          if (getValue(i - 1) <= value && value <= getValue(i))
          {
            //Depending where we come we asign i-1 or i
            if (oldIndex >= i){
              return i;
            } else {
              return i - 1
            }

          }
        }
      };
      //After moving a handler the values might be out of place (for example rzSliderHigh < rzSliderModel) Here we readjust the extended array
      function shiftIndex(originIndex, destIndex) {
        var originalValue = getValue(originIndex);
        var sign = originIndex > destIndex ? -1 : 1; //In which direction we should translate everything
        for (var i = 0; i < Math.abs(originIndex - destIndex); i++){
          var position = originIndex + i*sign;
          setValue(position, getValue(position + sign))
        }
        setValue(destIndex, originalValue)
      };
    },

    /**
     * onEnd event handler
     *
     * @param {Event}    event    The event
     * @param {Function} ehMove   The the bound move event handler
     * @returns {undefined}
     */
    onEnd: function(ehMove, event)
    {
      var moveEventName = this.getEventNames(event).moveEvent;

      this.minH.removeClass('rz-active');
      this.maxH.removeClass('rz-active');
      angular.forEach(this.middleHs, function(elem, index) {
        elem.removeClass('rz-active')
      });


      $document.off(moveEventName, ehMove);

      this.scope.$emit('slideEnded');
      this.tracking = '';
      if (this.activeLabel)
      {
        this.updateActiveLabel();
        this.updateCmbLabel();
      };
      this.dragging.active = false;
      this.callOnEnd();
    },

    /**
     * Get event names for move and event end
     *
     * @param {Event}    event    The event
     *
     * @return {{moveEvent: string, endEvent: string}}
     */
    getEventNames: function(event)
    {
      var eventNames = {moveEvent: '', endEvent: ''};

      if(event.touches || (event.originalEvent !== undefined && event.originalEvent.touches))
      {
        eventNames.moveEvent = 'touchmove';
        eventNames.endEvent = 'touchend';
      }
      else
      {
        eventNames.moveEvent = 'mousemove';
        eventNames.endEvent = 'mouseup';
      }

      return eventNames;
    }
  };

  return Slider;
})

.directive('rzslider', function(RzSlider)
{
  'use strict';

  return {
    restrict: 'E',
    scope: {
      rzSliderFloor: '=?',
      rzSliderCeil: '=?',
      rzSliderStep: '@',
      rzSliderPrecision: '@',
      rzSliderModel: '=?',
      rzSliderMiddle : '=?',
      rzSliderHigh: '=?',
      rzSliderDraggable: '@',
      rzSliderTranslate: '&',
      rzSliderHideLimitLabels: '=?',
      rzSliderHidePointerLabels: '=?',
      rzSliderAlwaysShowBar: '=?',
      rzSliderPresentOnly: '@',
      rzSliderOnStart: '&',
      rzSliderOnChange: '&',
      rzSliderOnEnd: '&',
      rzSliderShowTicks: '=?',
      rzSliderShowTicksValue: '=?',
      rzSliderDisabled: '=?',
      rzSliderInterval: '=?',
      rzSliderLegend : '@?',
      rzSliderActiveLabel : '@?',
    },

    /**
     * Return template URL
     *
     * @param {jqLite} elem
     * @param {Object} attrs
     * @return {string}
     */
    templateUrl: function(elem, attrs) {
      //noinspection JSUnresolvedVariable
      return attrs.rzSliderTplUrl || 'rzSliderTpl.html';
    },

    link: function(scope, elem, attr)
    {
      return new RzSlider(scope, elem, attr);
    }
  };
});

// IDE assist

/**
 * @name ngScope
 *
 * @property {number} rzSliderModel
 * @property {number} rzSliderHigh
 * @property {number} rzSliderCeil
 * @property {Array.<number>} rzSliderMiddle
 */

/**
 * @name jqLite
 *
 * @property {number|undefined} rzsl rzslider label left offset
 * @property {number|undefined} rzsw rzslider element width
 * @property {string|undefined} rzsv rzslider label value/text
 * @property {Function} css
 * @property {Function} text
 */

/**
 * @name Event
 * @property {Array} touches
 * @property {Event} originalEvent
 */

/**
 * @name ThrottleOptions
 *
 * @property {boolean} leading
 * @property {boolean} trailing
 */

  /*templateReplacement*/

  return module
}));
