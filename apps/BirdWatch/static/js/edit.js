"use strict";

let app = {};

app.data = {
    data: function() {
        return {
            sampling_event_id: '',
            latitude: '',
            longitude: '',
            observation_date_time: '',
            duration_minutes: '',
            common_name: '',
            sighting_count: ''
        };
    },
    methods: {
        redirectToMyChecklist() {
            window.location.href = my_checklist_url;
        },
        submitForm() {
            const formData = {
                sampling_event_id: this.sampling_event_id,
                latitude: this.latitude,
                longitude: this.longitude,
                observation_date_time: this.observation_date_time,
                duration_minutes: this.duration_minutes,
                common_name: this.common_name,
                sighting_count: this.sighting_count
            };
            axios.post(update_checklist_url, formData)
                .then(response => {
                    alert('Checklist updated successfully!');
                    window.location.href = my_checklist_url; // Redirect to my_checklist page
                })
                .catch(error => {
                    console.error('There was an error updating the checklist:', error);
                    alert('Failed to update checklist. Please try again.');
            });
        },
    },
};

app.vue = Vue.createApp(app.data).mount("#app");

app.load_data = function() {
};

app.load_data();
