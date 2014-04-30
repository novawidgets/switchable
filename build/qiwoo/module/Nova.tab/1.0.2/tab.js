(function(root, factory) {
if(typeof exports === 'object') {
module.exports = factory();
} else if(typeof define === 'function' && define.amd) {
define(['module/Nova.carousel/1.0.2/carousel'], factory);
} else {
root['Tab'] = factory();
}
})(this, function(Carousel) {
Carousel = Carousel || this.Carousel;



    Tab = Carousel.extend({
        attrs: {
            animate: true,
            recursive: false,
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

    return Tab;

});