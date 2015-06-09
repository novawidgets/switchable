/* Version 1.0.4 */

(function() {
    var Switchable = Widget.extend({
        /* 默认配置 */
        attrs: {
            index: -1,          // 初始选项
            count: 0,           // 选项个数
            recyclable: false    // 是否可循环
        },

        /* 初始化 */
        setup: function() {
        },

        /* 切换到下一个，成功返回true, 触发next事件 */
        next: function() {
            var index = this.get('index');
            var next= this.getNextIndex();
            if(next != -1) {
                this.switchTo(next);
                return true;
            }
            return false;
        },

        /* 切换到上一个，成功返回true, 触发prev事件 */
        prev: function() {
            var index = this.get('index');
            var prev = this.getPrevIndex();
            if( prev != -1) {
                this.switchTo(prev);
                return true;
            }
            return false;
        },

        getNextIndex: function() {
            var from = this.get('index'),
                to = -1, 
                count = this.get('count');
            if(this.get('recyclable')) {
                to = (from + 1) % count;
            }
            // 不可循环，但未超出范围
            else if((from + 1) < count){
                to = from + 1;
            }

            return to;
        },

        getPrevIndex: function() {
            var from = this.get('index'),
                to = -1, 
                count = this.get('count');
            if(this.get('recyclable')) {
                to = (from + count - 1) % count;
            }
            // 不可循环，但未超出范围
            else if((from - 1) >= 0){
                to = from - 1;
            }

            return to;

        },

        /* 切换到to, 成功返回true, 触发switch事件 */
        switchTo: function(to) {
            var from = this.get('index');
            if(from != to) {
                this.set('index', to)
                //this.trigger('switch', [from, to]);
                return true;
            }
            return false;
        },
    });

    this.Switchable = Switchable;
})(); 

(function() {
    var prefix = (function () {
        var styles = window.getComputedStyle(document.documentElement, ''),
        pre = (Array.prototype.slice
               .call(styles)
               .join('') 
               .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
              )[1],
              dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
              return {
                  dom: dom,
                  lowercase: pre,
                  css: '-' + pre + '-',
                  js: pre[0].toUpperCase() + pre.substr(1)
              };
    })();

    var SWIPE_DISTANCE_MIN = 25,
        RECUR_DURATION = 200,
        TRANSFORM_PROPERTY_NAME = prefix['css'] + 'transform';

    /***************************** Class Carousel ******************************/

    var Carousel = Switchable.extend({
        attrs: {
            // 可配置项
            index: 0,                   // 初始选中项
            recyclable: true,           // 是否可循环
            duration_ms: 200,           // 切换时长
            autoplay: false,            // 自动轮播
            autoplay_interval_ms: 10000,   // 自动轮播间隔
            swipable: true,             // 是否可滑动
            direction : 'horizontal',                   //水平
            selectors: {
                content: '.carousel-cont',
                contItem: '.cont-item',
                control: '.carousel-control',
                controlItem: '.control-item',
                active: '.active',
                current: '.current'
            },


            // 内部使用属性
            eles: {
                before: null,
                middle: null,
                after: null,
                control: null
            }
        },


        setup: function () {
            Carousel.superclass.setup && Carousel.superclass.setup.apply(this, arguments);
            var me = this;
            var selectors = me.get('selectors');
            me.slideDir = this.get('direction') == 'vertical' ? 1 : -1;
            // 初始化DOM
            me.contItems = me.$element.children(selectors.content).children(selectors.contItem);
            me.controlItems = me.$element.children(selectors.control).children(selectors.controlItem);
            me.dirLength = me._getSlideLength();

            // 绑定index, eles的change事件
            me.on('change:index', me._onChangeIndex);
            me.on('change:eles', me._onChangeEles);

            // 绑定prev, next方法执行前的事件
            me.before('prev', me._beforePrev);
            me.before('next', me._beforeNext);

            // 绑定tap事件
            me.delegateEvents(me.controlItems, 'tap', me._controlTapHandler);

            // 设置index, count
            me.set('count', me.contItems.length);

            // 如果标签数为1，则关闭Swipable
            if(me.get('count') <= 1) {
                me.set('swipable', false);
            }

            // 选中第一个
            this.set('index', parseInt(this.get('index')));

            this.get('swipable') && this._initSwipe(me.contItems.parent());

            this._bindResizeHandler();

            this.render();
        },

        _getSlideLength : function() {
            return this.slideDir == -1 ? this.contItems.parent().width() : this.contItems.parent().height();
        },

        refresh: function() {
            this.dirLength = this._getSlideLength();
            this._placeTo(this.get('eles.before'), -this.dirLength);
            this._placeTo(this.get('eles.after'), this.dirLength);
        },


        _initSwipe: function(element) {
            var me = this;
            var body = $(document.body)
            var curTouch, startX, startY, deltaX, deltaY, swipeDir;
            var isAutoplay;
            var stopPropogation;

            element.on('touchstart', function(ev) {
                //ev.stopPropagation();
                isAutoplay = me.get('autoplay');
                stopPropagation = false;

                // FIX: 二次确保这些事件已经被注销
                body.off('touchmove', touchmoveHandler);
                body.off('touchend', touchendHandler);
                body.off('touchcancel', touchendHandler);

                curTouch = ev.touches[0];
                startX = curTouch.pageX;
                startY = curTouch.pageY;
                deltaX = 0;
                deltaY = 0;
                swipeDir = undefined;

                body.on('touchmove', touchmoveHandler);
                body.on('touchend', touchendHandler);
                body.on('touchcancel', touchendHandler);

                me.trigger('swipestart');
            });

            function touchmoveHandler(ev) {
                var touch = ev.touches[0];
                deltaX = touch.pageX - startX;
                deltaY = touch.pageY - startY;
                // 手指初始触摸的方向 1: 垂直方向 -1: 水平方向
                if(swipeDir == undefined) {
                    swipeDir = Math.abs(deltaY) > Math.abs(deltaX) ? 1 : -1;
                }

                //如果 手指初始触摸的方向 跟设置的组件的滑动方向不同， 不滑动组件
                if(me.slideDir + swipeDir == 0) return;

                // 在carousel有嵌套时，注销外部carousel的事件
                if(!stopPropagation) {
                    body.off('touchmove touchend touchcancel');
                    body.on('touchmove', touchmoveHandler);
                    body.on('touchend', touchendHandler);
                    body.on('touchcancel', touchendHandler);
                    stopPropagation = true;
                }

                ev.preventDefault();

                // 组件的滑动方向 垂直 || 水平
                me.trigger('swipemove', [me.slideDir == -1 ? deltaX : deltaY]);

            }

            function touchendHandler(ev) {
                me.set('autoplay', isAutoplay);
                if(me.slideDir + swipeDir == 0) return;
                me.trigger('swipeend', [me.slideDir == -1 ? deltaX : deltaY]);
                body.off('touchmove', touchmoveHandler); 
                body.off('touchend', touchendHandler);
            }

            this.on('swipestart', function() {
                this.set('autoplay', false);
            })

            this.on('swipemove', function(ev, offset) {
                if(this.sliding) {return;}
                var prev = offset > 0 ? this.get('eles.after') : this.get('eles.before');
                var next = offset > 0 ? this.get('eles.before') : this.get('eles.after');
                var prevOffset = offset > 0 ? this.dirLength: -this.dirLength;
                var nextOffset = offset > 0 ? -this.dirLength: this.dirLength;

                if(!next[0] && offset != 0) {
                    offset /= 3; 
                }

                next.css(this._getOffsetCss(offset + nextOffset));
                prev[0] != next[0] && prev.css(this._getOffsetCss(prevOffset));
                this.get('eles.middle').css(this._getOffsetCss(offset));
            });
            this.on('swipeend', function(ev, offset) {
                if(this.sliding) {return;}
                var goback = false;
                if(Math.abs(offset) > SWIPE_DISTANCE_MIN) {
                    goback = !(offset > 0 ? this.prev() : this.next());                     
                } else {
                    goback = true;
                }
                if(goback) {
                    var next = offset > 0 ? this.get('eles.before') : this.get('eles.after');
                    var nextOffset = offset > 0 ? -this.dirLength: this.dirLength;
                    me.get('eles.middle').animate(me._getOffsetCss(0), RECUR_DURATION, 'ease');
                    next.animate(me._getOffsetCss(nextOffset), RECUR_DURATION, 'ease');
                }
            });
        },

        _bindResizeHandler: function() {
            this.delegateEvents(window, 'resize', function() {
                this.refresh();
            });
        },

        _controlTapHandler: function(ev) {
            if(this.sliding) {return;}

            var index = this.get('index');
            var to = this.controlItems.index(ev.currentTarget);

            if(to != index) {
                this.dir = to > index ? 1 : -1;
            }

            var isAutoplay = this.get('autoplay');
            this.set('autoplay', false);
            this.switchTo(to);
            this.set('autoplay', isAutoplay);
        },

        _beforePrev: function() {
            this.dir = -1;
        },

        _beforeNext: function() {
            this.dir = 1;
        },

        _onChangeIndex: function(ev, cur, prev) {
            this.trigger('beforeSwitch', [cur, prev]);
            var prevIndex = this.getPrevIndex();
            var nextIndex = this.getNextIndex();
            this.set('eles', {
                before: prevIndex != -1 ? this.contItems.eq(prevIndex) : $(),
                middle: this.contItems.eq(cur),
                after: nextIndex != -1 ? this.contItems.eq(nextIndex): $(),
                control: this.controlItems.eq(cur)
            });
            this.trigger('afterSwitch', [cur, prev]);
        },

        _onChangeEles: function(ev, curEles, prevEles) {
            var length = this.dirLength;
            var duration = this.get('duration_ms');
            var activeClass = this.get('selectors.active').slice(1);
            var currentClass = this.get('selectors.current').slice(1);
            var me = this;

            // dir = 1: 从右往左，  dir = -1: 从左往右
            var next = this.dir == 1 ? prevEles.after : prevEles.before;

            // 若将要滑动到中央的元素，初始位置未设置好
            // 例如：通过carousel-control点击切换到非相连的元素
            if(next && (next[0] != curEles.middle[0] || this._getTranslateOffset(next) * this.dir < 0)) {
                this._placeTo(curEles.middle, this.dir * length);
            }

            // 开始滑动
            this.sliding = true;

            // 触发reflow, 清除原来的transition遗留
            prevEles.middle && prevEles.middle.size() && prevEles.middle[0].clientLeft;
            curEles.middle && curEles.middle.size() && curEles.middle[0].clientLeft; 

            this._slideTo(prevEles.middle, -this.dir * length, duration);
            this._slideTo(curEles.middle, 0, duration, animateCallback);

            function animateCallback() {

                // 将prevEles中，不在curEles的element去掉active
                $.each(prevEles, function(name, ele) {
                    ele && ele.removeClass(activeClass);
                });
                prevEles.middle && prevEles.middle.removeClass(currentClass);

                // 为curEles, 加上active
                $.each(curEles, function(name, ele) {
                    ele && ele.addClass(activeClass).css(prefix['css'] + 'transition', 'none');
                });
                curEles.middle && curEles.middle.addClass(currentClass);

                //me._forceRender(curEles);

                // 设置好curEles的before, middle, after位置
                me._getElesPosReady(curEles);

                me.sliding = false;
            }
        },

        _onRenderAutoplay: function(ev, autoplay, prevAutoplay) {
            if(autoplay == prevAutoplay) { return; }
            var me = this;
            if(autoplay) {
                this.autoplayTimer = setInterval(function() {
                    if(!me.sliding) {
                        me.next(); 
                    }
                }, this.get('autoplay_interval_ms'));
            } else {
                clearInterval(this.autoplayTimer);
                this.autoplayTimer = undefined;
            } 
        },

        _getElesPosReady: function(eles) {
            this._placeTo(eles.middle, 0);
            this._placeTo(eles.before, -this.dirLength);
            this._placeTo(eles.after, this.dirLength);
        },

        _placeTo: function(ele, offset) {
            if(!ele) return;
            var cssObj = this._getOffsetCss(offset);
            ele.css(cssObj);
        },

        _slideTo: function(ele, offset, duration, callback) {
            offset = Math.round(offset);
            if(!ele || !ele[0]) {return;}

            var style = ele[0].style;
            var cssPrefix = prefix['css'];

            if ( !style ) {
                return;
            }

            // animate
            if(this.slideDir == -1) {
                style.cssText += cssPrefix + 'transition:' + duration +
                    'ms ease;' + cssPrefix + 'transform: translate3d(' +
                    offset + 'px, 0, 0);';
            } else {
                style.cssText += cssPrefix + 'transition:' + duration +
                    'ms ease;' + cssPrefix + 'transform: translate3d(0, ' +
                    offset + 'px, 0);';
            }
            // callback
            setTimeout(function() {
                callback && callback();
            }, duration);
        },

        _getOffsetCss: function(offset) {
            offset = Math.round(offset);
            var cssObj = {};
            if(this.slideDir == -1) {
                cssObj[TRANSFORM_PROPERTY_NAME] = 'translate3d(' + offset + 'px, 0, 0)';
            } else {
                cssObj[TRANSFORM_PROPERTY_NAME] = 'translate3d(0, ' + offset + 'px, 0)';
            }
            return cssObj;
        },

        _getTranslateOffset: function(ele) {
            var transform = window.getComputedStyle(ele[0])[TRANSFORM_PROPERTY_NAME],
                isMatrix3d = transform.indexOf('3d') >= 0,
                vector = transform.match(/\((.*)\)/)[1].split(','),
                tIndex = isMatrix3d ? [12, 13] : [4, 5];
            tIndex = this.slideDir == -1 ? tIndex[0] : tIndex[1];
            return parseInt(vector[tIndex]);
        }

    });

    /***************************** End of Class Carousel ******************************/

    this.Carousel = Carousel;
})();

(function() {

    Tab = Carousel.extend({
        attrs: {
            animate: true,
            recyclable: false,
            autoplay: false,

            selectors: {
                content: '.tab-cont',
                contItem: '.cont-item',
                control: '.tab-control',
                controlItem: '.control-item',
                active: '.active'
            },
        },
        setup: function() {
            if(!this.get('animate')) {
                this.set('swipable', false);
                this.set('duration_ms', 0);
            }
            Tab.superclass.setup.call(this);
        }
    });

    this.Tab = Tab;

})();
