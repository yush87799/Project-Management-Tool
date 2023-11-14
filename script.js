var projectManager = {
    key: "projects",

    addProject: function () {
        var userNameInput = document.getElementById("add-project");
        if (userNameInput.value == "") {
            swal("Please enter a User name");
            return false;
        }

        var data = JSON.parse(localStorage.getItem(this.key)) || [];

        var project = {
            id: data.length,
            name: userNameInput.value,
            tasks: [],
        };

        data.push(project);
        localStorage.setItem(this.key, JSON.stringify(data));

        this.loadAllProjects();
        this.showAllTasks();
    },

    getAllProjects: function () {
        return JSON.parse(localStorage.getItem(this.key)) || [];
    },

    loadAllProjects: function () {
        var projects = this.getAllProjects().reverse();
        var optionsHtml = "<option value=''>Select User</option>";

        projects.forEach(function (project) {
            optionsHtml += "<option value='" + project.id + "'>" + project.name + "</option>";
        });

        document.getElementById("add-task-project").innerHTML = optionsHtml;
        document.getElementById("form-task-hour-calculator-all-projects").innerHTML = optionsHtml;
    },

    addTask: function (form) {
        var projectId = form.project.value;
        var taskName = form.task.value;

        var projects = this.getAllProjects();
        var selectedProject = projects.find(function (project) {
            return project.id == projectId;
        });

        if (selectedProject) {
            var taskObj = {
                id: selectedProject.tasks.length,
                name: taskName,
                status: "Progress",
                isStarted: false,
                logs: [],
                started: this.getCurrentTimeInTaskStartEndFormat(),
                ended: "",
            };

            selectedProject.tasks.push(taskObj);
            localStorage.setItem(this.key, JSON.stringify(projects));

            $("#addTaskModal").modal("hide");
            $(".modal-backdrop").remove();

            this.showAllTasks();
        }

        return false;
    },

    showAllTasks: function () {
        var tasksHtml = "";

        var projects = this.getAllProjects();
        projects.forEach(function (project) {
            project.tasks.reverse().forEach(function (task) {
                tasksHtml += "<tr>";
                tasksHtml += "<td>" + task.name + "</td>";
                tasksHtml += "<td>" + project.name + "</td>";

                if (task.isStarted) {
                    tasksHtml += "<td><label class='started'>Started</label></td>";
                } else {
                    if (task.status == "Completed") {
                        tasksHtml += "<td><label class='completed'>" + task.status + "</label></td>";
                    } else {
                        tasksHtml += "<td>" + task.status + "</td>";
                    }
                }

                // Calculate duration and format it
                var duration = projectManager.calculateTaskDuration(task);
                tasksHtml += "<td>" + projectManager.formatDuration(duration) + "</td>";

                if (task.status == "Completed") {
                    tasksHtml += "<td>" + task.started + "<br><span style='margin-left: 30px;'>to</span><br>" + task.ended + "</td>";
                } else {
                    tasksHtml += "<td>" + task.started + "</td>";
                }

                tasksHtml += "<td>" + projectManager.generateTaskStatusDropdown(project.id, task.id) + "</td>";
                tasksHtml += "</tr>";
            });
        });

        document.getElementById("all-tasks").innerHTML = tasksHtml;
    },

    getCurrentTimeInTaskStartEndFormat() {
        var current_datetime = new Date();
        var formatted_date =
            current_datetime.getFullYear() + "-" +
            ("0" + (current_datetime.getMonth() + 1)).slice(-2) + "-" +
            ("0" + current_datetime.getDate()).slice(-2) + " " +
            ("0" + current_datetime.getHours()).slice(-2) + ":" +
            ("0" + current_datetime.getMinutes()).slice(-2) + ":" +
            ("0" + current_datetime.getSeconds()).slice(-2);

        return formatted_date;
    },

    calculateTaskDuration: function (task) {
        var duration = 0;
        task.logs.forEach(function (log) {
            if (log.endTime > 0) {
                duration += log.endTime - log.startTime;
            }
        });
        return duration;
    },

    formatDuration: function (durationInSeconds) {
        var hours = Math.floor(durationInSeconds / 3600) % 24;
        var minutes = Math.floor(durationInSeconds / 60) % 60;
        var seconds = durationInSeconds % 60;

        return (
            ("0" + hours).slice(-2) + ":" +
            ("0" + minutes).slice(-2) + ":" +
            ("0" + seconds).slice(-2)
        );
    },

    generateTaskStatusDropdown: function (projectId, taskId) {
        var dropdownHtml = "<form method='POST' id='form-change-task-status-" + projectId + taskId + "'>";
        dropdownHtml += "<input type='hidden' name='project' value='" + projectId + "'>";
        dropdownHtml += "<input type='hidden' name='task' value='" + taskId + "'>";
        dropdownHtml += "<select class='form-control' name='status' onchange='projectManager.changeTaskStatus(this);' data-form-id='form-change-task-status-" + projectId + taskId + "'>";
        dropdownHtml += "<option value=''>Change status</option>";
        if (projectManager.taskIsInProgress(task)) {
            dropdownHtml += "<option value='stop'>Stop</option>";
        } else {
            dropdownHtml += "<option value='start'>Start</option>";
        }
        dropdownHtml += projectManager.taskIsCompleted(task) ?
            "<option value='progress'>Make in Progress Again</option>" :
            "<option value='complete'>Mark as Completed</option>";
        dropdownHtml += "<option value='delete'>Delete</option>";
        dropdownHtml += "</select>";
        dropdownHtml += "</form>";

        return dropdownHtml;
    },

    taskIsInProgress: function (task) {
        return task.status === "Progress" && !task.isStarted;
    },

    taskIsCompleted: function (task) {
        return task.status === "Completed";
    },

    changeTaskStatus: function (dropdown) {
        if (dropdown.value === "") {
            return;
        }

        var formId = dropdown.getAttribute("data-form-id");
        var form = document.getElementById(formId);

        var projects = projectManager.getAllProjects();
        var selectedProject = projects.find(function (project) {
            return project.id == form.project.value;
        });

        if (selectedProject) {
            var selectedTask = selectedProject.tasks.find(function (task) {
                return task.id == form.task.value;
            });

            if (selectedTask) {
                projectManager.handleTaskStatusChange(selectedTask, dropdown.value);
            }
        }

        projectManager.handleFinalStatusUpdates(dropdown.value, projects);

        localStorage.setItem(projectManager.key, JSON.stringify(projects));
        projectManager.showAllTasks();
    },

    handleTaskStatusChange: function (task, status) {
        switch (status) {
            case "start":
                projectManager.startTask(task);
                break;
            case "stop":
                projectManager.stopTask(task);
                break;
            case "complete":
                projectManager.completeTask(task);
                break;
            case "progress":
                projectManager.progressTask(task);
                break;
            case "delete":
                projectManager.deleteTask(task);
                break;
            default:
                break;
        }
    },

    startTask: function (task) {
        swal({
            title: "Are you sure?",
            text: "This will start the timer.",
            icon: "warning",
            buttons: true,
            dangerMode: true,
        }).then((doStart) => {
            if (doStart) {
                task.isStarted = true;
                var logObj = {
                    id: task.logs.length,
                    startTime: new Date().getTime(),
                    endTime: 0,
                };
                task.logs.push(logObj);
            } else {
                dropdown.value = "";
            }
        });
    },

    stopTask: function (task) {
        swal({
            title: "Are you sure?",
            text: "This will stop the timer.",
            icon: "warning",
            buttons: true,
            dangerMode: true,
        }).then((doStop) => {
            if (doStop) {
                task.isStarted = false;
                for (var c = 0; c < task.logs.length; c++) {
                    if (task.logs[c].endTime == 0) {
                        task.logs[c].endTime = new Date().getTime();
                        break;
                    }
                }
            } else {
                dropdown.value = "";
            }
        });
    },

    completeTask: function (task) {
        task.status = "Completed";
        task.isStarted = false;
        task.ended = projectManager.getCurrentTimeInTaskStartEndFormat();

        for (var c = 0; c < task.logs.length; c++) {
            if (task.logs[c].endTime == 0) {
                task.logs[c].endTime = new Date().getTime();
                break;
            }
        }
    },

    progressTask: function (task) {
        task.status = "Progress";
        task.isStarted = false;
    },

    deleteTask: function (task) {
        swal({
            title: "Are you sure?",
            text: "Deleting the task will delete its hours too.",
            icon: "warning",
            buttons: true,
            dangerMode: true,
        }).then((willDelete) => {
            if (willDelete) {
                var project = projectManager.getProjectById(task.projectId);
                project.tasks.splice(project.tasks.indexOf(task), 1);
            } else {
                dropdown.value = "";
            }
        });
    },

    handleFinalStatusUpdates: function (status, projects) {
        if (status == "delete" || status == "start" || status == "stop") {
            // Do nothing for now
        } else {
            localStorage.setItem(projectManager.key, JSON.stringify(projects));
            projectManager.showAllTasks();
        }
    },

    getProjectById: function (projectId) {
        return projectManager.getAllProjects().find(function (project) {
            return project.id == projectId;
        });
    },
};

window.addEventListener("load", function () {
    projectManager.loadAllProjects();
    projectManager.showAllTasks();

    setInterval(function () {
        var dataStarted = document.querySelectorAll("td[data-started]");
        dataStarted.forEach(function (dataStartedObj) {
            var dataStartedObj = JSON.parse(dataStartedObj.getAttribute("data-started"));
            dataStartedObj.duration++;

            var hours = Math.floor(dataStartedObj.duration / 3600) % 24;
            var minutes = Math.floor(dataStartedObj.duration / 60) % 60;
            var seconds = dataStartedObj.duration % 60;

            dataStartedObj.innerHTML = projectManager.formatDuration(dataStartedObj.duration);

            var projects = projectManager.getAllProjects();
            var selectedProject = projects.find(function (project) {
                return project.id == dataStartedObj.project;
            });

            if (selectedProject) {
                var selectedTask = selectedProject.tasks.find(function (task) {
                    return task.id == dataStartedObj.task;
                });

                if (selectedTask) {
                    selectedTask.logs[selectedTask.logs.length - 1].endTime = new Date().getTime();
                    localStorage.setItem(projectManager.key, JSON.stringify(projects));
                    dataStartedObj.setAttribute("data-started", JSON.stringify(dataStartedObj));
                }
            }
        });
    }, 1000);
});
