"use strict";

let app = {};

app.data = {
    data: function() {
        return {
            //my_checklist page
            my_checklist_data: [],
        };
    },
    methods: {
        redirectToMyChecklist() {
            window.location.href = my_checklist_url;
        },
        // for my_checklist page
        redirectToForm() {
            window.location.href = form_url;
        },
        deleteEntry(sampling_event_id, common_name) {
            let self = this;
            axios.post(delete_entry_url, { sampling_event_id: sampling_event_id })
                .then(function (response) {
                    if (response.data === "ok") {
                        // Remove entry from the checklist data
                        self.my_checklist_data = self.my_checklist_data.filter(entry => entry.sampling_event_id !== sampling_event_id);
                    } else {
                        console.error("Failed to delete entry");
                    }
                })
                .catch(function (error) {
                    console.error("Error deleting entry:", error);
                });
        },
        // redirectToEdit(sampling_event_id) {
        //     // Redirect to edit page with sampling_event_id as parameter
        //     window.location.href = edit_url + "?sampling_event_id=" + sampling_event_id;
        // }
    },
};

app.vue = Vue.createApp(app.data).mount("#app");

app.load_data = function() {
    // for my_checklist page
    axios.get(my_checklist_data_url).then(response => {
        app.vue.my_checklist_data = response.data.my_checklist_data;
        console.log("my_checklist_data:", app.vue.my_checklist_data);
    });
};

app.load_data();
