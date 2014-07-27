;(function(exports){
// -- Popbox by otarim
function preventDefault(e){
	e = window.event || e;
	e.preventDefault ? e.preventDefault() : e.returnValue = false;
	return true;
}
function getData(el, property) {
	return 'dataset' in el ? el.dataset[property] : el.getAttribute('data-' + property);
}
function setData(el, property, value) {
	return 'dataset' in el ? (el.dataset[property] = value) : (el.setAttribute('data-' + property,value))
}
var eventHub = {};
var isIE = !-[1,];
var specialTypes = {
	mouseenter : {
		type: 'mouseover',
		target: 'fromElement'
	},
	mouseleave: {
		type: 'mouseout',
		target: 'toElement'
	},
	focus: (isIE ? 'focusin' : 'focus'),
	blur: (isIE ? 'focusout' : 'blur')
}

var addEvent = (function() {
	var contains = function(el,target){
		if(el.compareDocumentPosition){
			return (el.compareDocumentPosition(target) & 16) !== 0;
		}else{
			return el.contains(target);
		}
	}
	var bindEvent = function(el,type,callback,rpk){
		var _callback = callback,useCapture = false,
			target,_type;
		if(type === 'mouseenter' || type === 'mouseleave'){
			_type = type;
			type = specialTypes[_type]['type'];
			callback = function(e){
				var e = window.event || e;
				target = e.relatedTarget || e[specialTypes[_type]['target']];
				if(contains(el,target) || el === target){
					e.stopPropagation ? e.stopPropagation() : e.cancelBubble = true;
				}else{
					_callback.call(el,e);
				}
			}
			eventHub[_type] = eventHub[_type] || [];
			eventHub[_type].push({
				_callback: _callback,
				callback: callback
			});
		}
		if(type === 'blur' || type === 'focus'){
			useCapture = true;
			type = specialTypes[type];
		}
		return rpk.call(el,type,callback,useCapture);
		
	}
	if (typeof addEventListener === 'function') {
		return function(el, type, callback) {
			bindEvent(el, type, callback,function(type,callback,useCapture){
				return el.addEventListener(type, callback, useCapture);
			});
		}
	} else {
		return function(el, type, callback) {
			bindEvent(el, type, callback,function(type,callback){
				return el.attachEvent('on'+type, callback);
			});
		}
	}
})();

var removeEvent = (function(){
	var digCallback = function(el,type,callback,rpk){
		var hub,_type,useCapture = false;
		if(type === 'mouseenter' || type === 'mouseleave'){
			hub = eventHub[type];
			_type = type;
			type = specialTypes[_type]['type'];
			for(var i = 0;i < hub.length;i++){
				if(callback === hub[i]['_callback']){
					callback = hub[i]['callback'];
					break;
				}
			}
		}
		if(type === 'blur' || type === 'focus'){
			useCapture = true;
			type = specialTypes[type];
		}
		return rpk.call(el,type,callback,useCapture);
	}
	if (typeof removeEventListener === 'function') {
		return function(el, type, callback) {
			digCallback(el,type,callback,function(type,callback,useCapture){
				return el.removeEventListener(type,callback,useCapture);
			})
		}
	} else {
		return function(el, type, callback) {
			digCallback(el, type, callback,function(type,callback){
				return el.attachEvent('on'+type, callback);
			});
		}
	}
})();

var merge = function(obj,target){
	for(var i in target){
		if(target.hasOwnProperty(i)){
			obj[i] = target[i];
		}
	}
	return obj;
}

var coStyle = function(styleList){
	var ret = [';'];
	for(var i in styleList){
		if(styleList.hasOwnProperty(i)){
			ret.push(i + ':' + styleList[i]);
		}
	}
	return ret.join(';')
}

var addPrefix = function(property,value){
	var prefix = ['-webkit-','-moz-','-ms-','-o-',''],ret = [];
	for(var i = 0;i<prefix.length;i++){
		ret.push(prefix[i] + property + ':' + value);
	}
	return ret.join(';');
}

function Popbox(config){
	var wrap = this.el = document.createElement('div');
	var defaultEvent = {
		'click#popClose': this.close
	};
	this.config = config || {};
	this.config.dragable && this.bindDragEvent(defaultEvent);
	this.events = this.config.events && merge(defaultEvent,config.events) || defaultEvent;
	wrap.className = 'popbox-container_';
	wrap.style.cssText += ';position: fixed;_position: absolute;display: none;top: 50%;left: 50%;';
	this.config.style && (wrap.style.cssText += coStyle(config.style));
	wrap.innerHTML = this.config.el && config.el.call(this,this.el) || '';
	document.body.insertBefore(wrap, document.body.firstChild);
	this.config.overlay && this.buildOverlay();
	this.bind();
}

Popbox.prototype = {
	reDraw: function(callback,styleObj){
		styleObj && (this.el.style.cssText += coStyle(styleObj));
		this.el.innerHTML = callback.call(this,this.el);
		this.layoutFix();
		return this;
	},
	bind: function(){
		var eventList = this.events,
			self = this;
		var getEventList = function(target){
			return getData(target,'event') && getData(target,'event').split(',') || [];
		}
		var matchEvent = function(eventType,eventName){
			if(typeof [].indexOf === 'function'){
				return eventType.indexOf(eventName) !== -1
			}else{
				for(var i = 0,l = eventType.length;i < l;i++){
					if(eventType[i] === eventName){
						return true;
					}
				}	
				return false;
			}
		}
		for(var i in eventList){
			if(eventList.hasOwnProperty(i)){
				(function(i){
					var customEvent = i.split('#');
					var callback = function(e){
						e = window.event || e;
						var target = e.srcElement || e.target,
							eventType = getEventList(target);
						if(matchEvent(eventType,customEvent[1])){
							eventList[i].call(self,e,target);
						}
					}
					addEvent(self.el,customEvent[0],callback);
				})(i)
			}
		}
	},
	close: function(){
		this.toggleOverlay(false);
		this.el.style.cssText += ';display: none;';
		return this;
	},
	show: function(){
		this.toggleOverlay(true);
		this.el.style.cssText += ';display: block;';
		this.layoutFix();
		return this;
	},
	remove: function(){
		document.body.removeChild(this.el);
		document.body.removeChild(this.overlayEl);
	},
	buildOverlay: function(){
		var overlay;
		this.overlayEl = overlay = document.createElement('div');
		overlay.style.cssText += ';position: absolute;display: none;width: 100%;height: 100%;top: 0;left: 0;background: #000;filter: alpha(opacity=50);opacity: .5;';
		document.body.insertBefore(overlay, document.body.firstChild);
	},
	toggleOverlay: function(show){
		if(this.overlayEl){
			if(show === true){
				this.overlayEl.style.cssText += ';display: block';
			}else{
				this.overlayEl.style.cssText += ';display: none';
			}
		}
	},
	bindDragEvent: function(defaultEvent){
		var self = this;
		var dragEventFn = function(e,target){
			var elStyle = this.el.style,
				elTop = this.el.offsetTop,
				elLeft = this.el.offsetLeft;
			var beginPos = {x: e.pageX || e.clientX,y: e.pageY || e.clientY},endPos = {};
			elStyle['marginLeft'] = elStyle['marginTop'] = '';
			elStyle.cssText += ';top: ' + elTop + 'px;left: ' + elLeft + 'px;';
			document.onmousemove = function(e){
				e = window.event || e;
				endPos = {x: e.pageX || e.clientX,y: e.pageY || e.clientY};
				elStyle.cssText += ';top: ' +( elTop + endPos.y - beginPos.y) + 'px;left: ' + (elLeft + endPos.x - beginPos.x)+ 'px;';
			}
			document.onmouseup = function(){
				document.onmouseup = document.onmousemove = document.onselect = null;
			}
		}
		defaultEvent['mousedown#popDrag'] = dragEventFn;
	},
	layoutFix: function(){
		var offX,offY;
		if(!-[1,] || this.config.dragable){
			offX = -this.el.offsetWidth / 2 + 'px';
			offY = -this.el.offsetHeight / 2 + 'px';
			this.el.style.cssText += ';margin-top: ' + offY + ';margin-left: ' + offX;
		}else{
			this.el.style.cssText += addPrefix('transform','translate(-50%,-50%)');
		}
	}
}
exports.Popbox = Popbox;
})(window)