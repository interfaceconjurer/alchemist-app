

export const PubSub = {
    events: {},
    addListener: function(eventName, fn){
        this.events[eventName] = this.events[eventName] || [];
        this.events[eventName].push(fn);
    },
    removeListener: function(eventName, fn){
        if(this.events[eventName]){
            for(var i = 0; i < this.events[eventName].length; i++){
                if(this.events[eventName][i] === fn){
                    this.events[eventName].splice(i, 1);
                    break;
                }
            }
        }
    },
    fire: function(eventName, data){
        if(this.events[eventName]){
            this.events[eventName].forEach(function(fn){
                fn(data);
            })
        }
    }
}

export default PubSub;