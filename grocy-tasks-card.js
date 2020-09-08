customElements.whenDefined('card-tools').then(() => {
    let cardTools = customElements.get('card-tools');
      
    class GrocyTasksCard extends cardTools.LitElement {
      
      setConfig(config) {
        if (!config.entity) {
          throw new Error('Please define entity');
        }
        this.config = config;
      }
      
      calculateDueDate(dueDate){
        var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
        var today = new Date();
        today.setHours(0,0,0,0)
  
        var splitDate = dueDate.split(/[- :T]/)
        var parsedDueDate = new Date(splitDate[0], splitDate[1]-1, splitDate[2]);
        parsedDueDate.setHours(0,0,0,0)
        
        var dueInDays;
        if(today > parsedDueDate) {
          dueInDays = -1;
        }
        else
          dueInDays = Math.round(Math.abs((today.getTime() - parsedDueDate.getTime())/(oneDay)));
  
        return dueInDays;
      }
  
      checkDueClass(dueInDays) {
        if (dueInDays == 0)
          return "due-today";
        else if (dueInDays < 0)
          return "overdue";
        else
          return "not-due";
      }
  
      formatDueDate(dueDate, dueInDays) {
        if (dueInDays < 0)
          return this.translate("Overdue");
        else if (dueInDays == 0)
          return this.translate("Today");
        else
          return dueDate.substr(0, 10);
      }
  
      translate(string) {
        if((this.config.custom_translation != null) &&
            (this.config.custom_translation[string] != null))
            {
               return this.config.custom_translation[string];
            }
        return string;
      }
    
      render(){
        if (!this.entity)
        return html`
        <hui-warning>
          ${this._hass.localize("ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this.config.entity
          )}
        </hui-warning>
        `
        return cardTools.LitHtml
        `
          ${this._renderStyle()}
          ${cardTools.LitHtml
            `<ha-card>
              <div class="header">
                <div class="name">
                  ${this.header}
                </div>
              </div>
              <div>
                ${this.tasks.length > 0 ? cardTools.LitHtml`
                ${this.tasks.map(task =>
                  cardTools.LitHtml`
                  <div class="info flex">
                    <div>
                      ${task.name}
                      <div class="secondary">
                        ${this.translate("Due")}: <span class="${task.due_date != null ? this.checkDueClass(task.dueInDays) : ""}">${task.due_date != null ? this.formatDueDate(task.due_date, task.dueInDays) : "-"}</span>
                      </div>
                      ${this.show_description == true && task.description != null ? cardTools.LitHtml
                        `
                        <div class="secondary">
                            ${task.description}
                        </div>
                        `
                      : ""}
                      ${this.show_assigned == true && task.assigned_to_user_id != null ? cardTools.LitHtml
                        `
                        <div class="secondary">
                            ${this.translate("Assigned to")}: ${task.assigned_to_user_id}
                        </div>
                        `
                      : ""}
                      ${this.show_category == true && task.category_id != null ? cardTools.LitHtml
                        `
                        <div class="secondary">
                            ${this.translate("Category")}: ${task.category_id}
                        </div>
                        `
                      : ""}
                    </div>
                    <div>
                      <mwc-button @click=${ev => this._track(task.id)}>${this.translate("Complete")}</mwc-button>
                    </div>
                  </div>`
                )}` : cardTools.LitHtml`<div class="info flex">${this.translate("No tasks")}!</div>`}
              </div>
              ${this.notShowing.length > 0 ? cardTools.LitHtml
                `
                <div class="secondary">
                    ${this.translate("Look in Grocy for {number} more tasks").replace("{number}", this.notShowing.length)}
                </div>
                `
              : ""}
            </ha-card>`}
        `;
      } 
  
      _track(taskId){
        this._hass.callService("grocy", "complete_task", {
          task_id: taskId,
          tracked_time: new Date().toISOString(),
          done_by: this.userId
        });
      }
  
      _renderStyle() {
          return cardTools.LitHtml
          `
            <style>
              ha-card {
                padding: 16px;
              }
              .header {
                padding: 0;
                @apply --paper-font-headline;
                line-height: 40px;
                color: var(--primary-text-color);
                padding: 4px 0 12px;
              }
              .info {
                padding-bottom: 1em;
              }
              .flex {
                display: flex;
                justify-content: space-between;
              }
              .overdue {
                color: red !important;
              }
              .due-today {
                color: orange !important;
              }
              .secondary {
                display: block;
                color: #8c96a5;
            }
            </style>
          `;
        }
      
      set hass(hass) {
        this._hass = hass;
        
        this.entity = this.config.entity in hass.states ? hass.states[this.config.entity] : null;
  
        this.header = this.config.title == null ? "Tasks" : this.config.title;
        this.userId = this.config.user_id == null ? 1 : this.config.user_id;
  
        this.show_quantity = this.config.show_quantity == null ? null : this.config.show_quantity;
        this.show_days = this.config.show_days == null ? null : this.config.show_days;
  
        this.filter_user = this.config.filter_user == null ? null : this.config.filter_user;
        this.filter_category = this.config.filter_category == null ? null : this.config.filter_category;
  
        this.show_assigned = this.config.show_assigned == null ? true : this.config.show_assigned;
        this.show_category = this.config.show_category == null ? true : this.config.show_category;
        this.show_description = this.config.show_description == null ? true : this.config.show_description;
  
        if (this.entity) {
          if (this.entity.state == 'unknown')
            throw new Error("The Grocy sensor is unknown.");
  
          var tasks = this.entity.attributes.tasks;
          var allTasks = []
    
          if(tasks != null){
            tasks.sort(function(a,b){
              if (a.due_date != null && b.due_date != null) {
                var aSplitDate = a.due_date.split(/[- :T]/)
                var bSplitDate = b.due_date.split(/[- :T]/)
      
                var aParsedDueDate = new Date(aSplitDate[0], aSplitDate[1]-1, aSplitDate[2]);
                var bParsedDueDate = new Date(bSplitDate[0], bSplitDate[1]-1, bSplitDate[2]);
      
                return aParsedDueDate - bParsedDueDate;
              }
                return;
            })
  
            if (this.filter_user != null) {
              var filteredTasks = [];
              for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].assigned_to_user_id != null && tasks[i].assigned_to_user_id == this.filter_user) {
                  filteredTasks.push(tasks[i]);
                }
              }
              tasks = filteredTasks;
            }
            if (this.filter_category != null) {
              var filteredTasks = [];
              for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].category_id != null && tasks[i].category_id == this.filter_category) {
                  filteredTasks.push(tasks[i]);
                }
              }
              tasks = filteredTasks;
            }
            tasks.map(task =>{
              var dueInDays = task.due_date ? this.calculateDueDate(task.due_date) : 10000;
              task.dueInDays = dueInDays;
              if(this.show_days != null) {
                if(dueInDays <= this.show_days){
                  allTasks.push(task);
                }
                else if(task.due_date != null && task.due_date.slice(0,4) == "2999") {
                  task.due_date = "-";
                  allTasks.unshift(task)
                }
              }
              else {
                if(task.due_date == null || dueInDays == 10000 || task.due_date.slice(0,4) == "2999"){
                  task.due_date = "-";
                  allTasks.unshift(task)
                }
                else
                allTasks.push(task);
              }
            })
            
            if(this.show_quantity != null){
              this.tasks = allTasks.slice(0, this.show_quantity);
              this.notShowing = allTasks.slice(this.show_quantity);
            }
            else{
              this.tasks = allTasks;
              this.notShowing = 0;
            }
          }
          else
            this.tasks = allTasks;
          
          this.state = this.entity.state
        }
        
  
        this.requestUpdate();
      }
      
      // @TODO: This requires more intelligent logic
      getCardSize() {
        return 3;
      }
    }
    
    customElements.define('grocy-tasks-card', GrocyTasksCard);
    });
    
    window.setTimeout(() => {
      if(customElements.get('card-tools')) return;
      customElements.define('grocy-tasks-card', class extends HTMLElement{
        setConfig() { throw new Error("Can't find card-tools. See https://github.com/thomasloven/lovelace-card-tools");}
      });
    }, 2000);
  
