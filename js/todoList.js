// 数组forEach方法补丁
Array.prototype.forEach = [].forEach || function(callback){
	var a = 0,
		len = this.length;
	while(a < len){
		callback(this[a], a++, this);
	}
};
// 数组map方法补丁
Array.prototype.map = [].map || function(callback){
	var a = 0,
		len = this.length,
		result = [];
	while(a < len){
		result.push(callback(this[a], a++, this));
	}
	return result;
};
// 数组filter方法补丁
Array.prototype.filter = [].filter || function(callback){
	var a = -1,
		len = this.length,
		result = [];
	while(++a < len){
		callback(this[a], a, this) && result.push(this[a]);
	}
	return result;
};
// 函数bind方法补丁
Function.prototype.bind = function(){}.bind || function(){
	var _this = this;
	return function(){
		return function(){}.call.apply(_this, arguments);
	};
};
// TodoList
var TodoList = function(){
	function dc(tagName){
		return document.createElement(tagName);
	}
	// TodoList对象
	var TodoList = {
		// 输入栏
		InputBar : function(oTasks){
			var element = dc("div"),
				checkbox = dc("input"),
				userInput = dc("input");
			// 输入框失去焦点并且其value、以及checkbox值发生改变时才会触发onchange事件
			checkbox.onchange = function(){
				oTasks.checkAll(this.checked);
			};
			// 设置输入框属性
			userInput.className = "userInput";
			userInput.placeholder = "想要设定些什么任务？";
			userInput.onkeyup = function(e){
				/^\S+$/.test(this.value) && (e || event).keyCode === 13 && oTasks.appendTask(this.value/*输入框的值*/, function(){
					e.target.value = "";
				}/*保证任务列表添加好了一个新任务后再执行此清空方法*/);
			};
			checkbox.type = "checkbox";
			// 设置输入栏属性
			element.className = "inputBar";
			element.appendChild(checkbox);
			element.appendChild(userInput);
			this.element = element;
		},
		// 任务列表
		Tasks : function(){
			var element = dc("ul"),
				_this = this;
			element.className = "tasks";
			this.element = element;
			this.arrTasks = [];
			// 数据筛选器集合
			this.reducers = [
				function(){},
				this.setUndoTasks,
				this.setDoneTasks
			];
			// 当前的状态栏的选中状态
			this.status = 0;
			// 任务类
			function Task(parentObject, key, text){
				// 创建单条任务容器
				var element = dc("li"),
					checkbox = dc("input"),
					p = dc("p"),
					a = dc("a"),
					_this = this;
				// 设置对父级对象的引用
				this.parentObject = parentObject;
				this.key = key;
				this.isDone = 0;
				// 设置选框属性
				checkbox.type = "checkbox";
				checkbox.onchange = function(){
					_this.isDone ^= 1;
					_this.parentObject.subscriber.update(_this.parentObject.arrTasks);
					p.className = ["", "checked"][+this.checked];
					parentObject.reducers[parentObject.status].call(parentObject);
				};
				p.innerText = text;
				// 设置删除按钮属性
				a.innerText = "×";
				a.onclick = function(){
					_this.removeTask(element);
				};
				// 添加所有子级元素至当前任务容器
				element.appendChild(checkbox);
				element.appendChild(p);
				element.appendChild(a);
				// 开放选框属性方便外部使用
				this.checkbox = checkbox;
				this.element = element;
			}
			// 删除本条任务
			Task.prototype.removeTask = function(){
				var parentObject = this.parentObject,
					_this = this;
				parentObject.update(parentObject.arrTasks.filter(function(item){
					return item.key !== _this.key;
				}), 1);
				// parentObject.subscriber.update(parentObject.arrTasks);
			};
			// 开放为任务属性方便外部使用
			this.Task = Task;
		},
		// 底部状态栏
		StatusBar : function(oTasks){
			var element = dc("div"),
				rest = dc("span"),
				arrButtons = [
					{
						text : "全部",
						click : function(){
							oTasks.update(oTasks.arrTasks);
						}
					},
					{
						text : "未完成",
						click : function(){
							oTasks.update(oTasks.arrTasks.filter(function(item){
								return !item.isDone;
							}));
						}
					},
					{
						text : "已完成",
						click : function(){
							oTasks.update(oTasks.arrTasks.filter(function(item){
								return item.isDone;
							}));
						}
					}
				].map(function(item, index){
					return new Button(item, index);
				}),
				clear = dc("b"),
				index = 0;
			// 状态切换按钮类
			function Button(option, key){
				var element = dc("a"),
					_this = this;
				element.innerText = option.text;
				this.key = key;
				element.onclick = function(e){
					_this._click(this);
					option.click(e/*保证外部的点击事件处理方法能够获取到当前标签的事件对象*/);
				};
				this.element = element;
			}
			// 设置默认点击事件
			Button.prototype._click = function(element){
				arrButtons[index].element.className = "";
				index = this.key;
				element.className = "current";
				oTasks.status = index;
			};
			element.className = "statusBar";
			// 清空按钮的属性
			clear.innerText = "清空已完成任务";
			clear.onclick = function(){
				oTasks.setUndoTasks(1);
			};
			// 添加所有子级元素至当前状态栏容器
			element.appendChild(rest);
			arrButtons[0].element.click();
			arrButtons.forEach(function(item){
				element.appendChild(item.element);
			});
			element.appendChild(clear);
			this.rest = rest;
			this.element = element;
			// 订阅任务栏，任务栏会保证将每次更新的数据告知状态栏
			this.subscribe(oTasks);
		},
		// 初始化
		init : function(parentNode, callback){
			// 创建TodoList的容器
			var element = dc("div"),
				_this = this;
			element.className = "todoList";
			// 设置TodoList的属性方便内部对象调用
			this.tasks = new this.Tasks;
			this.inputBar = new this.InputBar(this.tasks);
			this.statusBar = new this.StatusBar(this.tasks);
			// 添加所有子级元素至当前TodoList容器
			element.appendChild(this.inputBar.element);
			element.appendChild(this.tasks.element);
			element.appendChild(this.statusBar.element);
			parentNode.appendChild(element);
			typeof callback === "function" && callback();
		}
	};
	TodoList.Tasks.prototype = {
		constructor : TodoList.Tasks,
		// 获取任务的唯一识别码
		getkey : function(){
			var a = 0;
			return function(){
				return ++a;
			};
		}(),
		// 任务列表的添加一条任务方法
		appendTask : function(text, callback){
			var task = new this.Task(this, this.getkey(), text);
			this.arrTasks.push(task);
			this.appendTaskToList(task);
			this.dispatch();
			typeof callback === "function" && callback(); // 保证任务列表添加好了一个新任务后再执行此清空方法
		},
		// 向任务栏容器中添加子任务的标签元素
		appendTaskToList : function(task){
			this.element.insertBefore(task.element, this.element.childNodes[0]);
		},
		// 设置未完成选项的数据更新
		setUndoTasks : function(isDeep){
			this.update(this.arrTasks.filter(function(item){
				return !item.isDone;
			}), isDeep, this.status >> 1);
		},
		// 设置已完成选项的数据更新
		setDoneTasks : function(){
			this.update(this.arrTasks.filter(function(item){
				return item.isDone;
			}));
		},
		// 任务列表的全选方法
		checkAll : function(checked){
			this.arrTasks.forEach(function(item){
				var checkbox = item.checkbox;
				// 全部勾选
				checked && checkbox.checked || checkbox.click();
				// 全部清空
				checked || checkbox.checked && checkbox.click();
			});
		},
		// 任务栏分发给状态栏最新的任务数据
		dispatch : function(){
			this.subscriber && this.subscriber.update(this.arrTasks);
		},
		// 根据外部处理方法处理后的新数据更新任务栏
		update : function(arrTasks, isDeep, isNotUpdateTasks){
			var _this = this;
			// diff算法待添加，目前切换状态栏时任务列表被全部清空重造
			this.element.innerText = "";
			isNotUpdateTasks || arrTasks.forEach(_this.appendTaskToList.bind(_this));
			if(isDeep){
				this.arrTasks = arrTasks;
			}
			// 分发给状态栏最新的任务数据集
			this.dispatch();
		}
	};
	TodoList.StatusBar.prototype = {
		constructor : TodoList.StatusBar,
		// 状态栏订阅任务栏对象
		subscribe : function(obj){
			obj.subscriber = this;
			// obj.dispatch();
		},
		// 更新任务条数的显示
		update : function(arrTasks){
			this.rest.innerText = ["还剩 ", arrTasks.filter(function(item){
				return !item.isDone;
			}).length, " 条未完成任务"].join("");
		}
	};
	// 对外开放插件加载完成的钩子函数，方便异步设置初始数据
	return function(option){
		if(typeof option !== "object"){
			throw new Error("请传入TodoList配置！");
		}
		var element = option.element,
			hook = option.mounted;
		if(!(element instanceof HTMLElement)){
			throw new Error ("清为配置添加element属性！");
		}
		// 执行初始化TodoList
		TodoList.init(option.element, function(){
			typeof hook === "function" && hook.call(option, function(tasks, callback){
				tasks.forEach(TodoList.tasks.appendTask.bind(TodoList.tasks));
				typeof callback === "function" && callback();
			});
		});
	};
}();