window.Nova.Components._Switchable = {
    props: {
        index: {
            type: Number,
            value: -1
        },
        count: {
            type: Number,
            value: 0
        },
        loop: {
            type: Boolean,
            value: false
        }
    },
    createdHandler: function() {
    },

    /* 切换到下一个，成功返回true, 触发next事件 */
    next: function() {
        var index = this.index;
        var next= this.getNextIndex();
        if(next != -1) {
            this.switchTo(next);
            return true;
        }
        return false;
    },

    /* 切换到上一个，成功返回true, 触发prev事件 */
    prev: function() {
        var index = this.index;
        var prev = this.getPrevIndex();
        if( prev != -1) {
            this.switchTo(prev);
            return true;
        }
        return false;
    },

    getNextIndex: function() {
        var from = this.index,
            to = -1, 
            count = this.count;
        if(this.loop) {
            to = (from + 1) % count;
        }
        // 不可循环，但未超出范围
        else if((from + 1) < count){
            to = from + 1;
        }

        return to;
    },

    getPrevIndex: function() {
        var from = this.index,
            to = -1,
            count = this.count;
        if(this.loop) {
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
        var from = this.index;
        if(from != to) {
            this.index = to;
            //this.trigger('switch', [from, to]);
            return true;
        }
        return false;
    },
}
