"use strict";

let app = {};

app.data = {
    data: function() {
        return {
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
        getUrlParam(param) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(param);
        },
        populateFormFields() {
            const lat = this.getUrlParam('lat');
            const lng = this.getUrlParam('lng');
            if (lat) this.latitude = lat;
            if (lng) this.longitude = lng;
        },
        submitForm() {
            const formData = {
                latitude: this.latitude,
                longitude: this.longitude,
                observation_date_time: this.observation_date_time,
                duration_minutes: this.duration_minutes,
                common_name: this.common_name,
                sighting_count: this.sighting_count
            };
            axios.post(add_checklist_url, formData)
                .then(response => {
                    alert('Checklist added successfully!');
                    // Redirect or reset the form after successful submission
                    // redirectToMyChecklist();
                })
                .catch(error => {
                    console.error('There was an error adding the checklist:', error);
                    alert('Failed to add checklist. Please try again.');
                });
        },
    },
    mounted() {
        this.populateFormFields();
    }
};

app.vue = Vue.createApp(app.data).mount("#app");
