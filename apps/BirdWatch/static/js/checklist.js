"use strict";

let app = {};

app.data = {
    data: function() {
        return {
            // checklist page
            checklist_data: [],
            search: [],
            bird_search: localStorage.getItem('bird_search') || '',
            search_active: false,
        };
    },
    methods: {
        // for checklist page
        toggle_search() {
            if (this.bird_search.trim() !== '') {
                this.search_active = true;
                this.search = this.checklist_data.filter(entry =>
                    entry.common_name.toLowerCase().startsWith(this.bird_search.toLowerCase()));
            } else {
                this.search_active = false;
                this.search = [];
            }

            // Save the search term to localStorage
            localStorage.setItem('bird_search', this.bird_search);
        },
        redirectToMyChecklist() {
            window.location.href = my_checklist_url;
        },
        updateSightings(species, new_sightings) {
            axios.post(update_sightings_url, {
                common_name: species.common_name,
                new_sightings: new_sightings
            }).then(response => {
                species.total_sightings = response.data.total_sightings;
                location.reload();
            }).catch(error => {
                console.error('There was an error updating the sightings:', error);
            });
        },
        handleKeyUp(event, species) {
            if (event.key === 'Enter') {
                this.updateSightings(species, species.new_sightings);
            }
        },
        incrementSightings(species) {
            const new_sightings = (species.new_sightings || 0) + 1;
            axios.post(update_sightings_url, {
                common_name: species.common_name,
                new_sightings: new_sightings
            }).then(response => {
                species.total_sightings = response.data.total_sightings;
                species.new_sightings = new_sightings;
                location.reload();
            }).catch(error => {
                console.error('There was an error incrementing the sightings:', error);
            });
        },
    },
    mounted() {
        // Initialize the search if there's a stored value
        if (this.bird_search.trim() !== '') {
            this.toggle_search();
        }
    }
};

app.vue = Vue.createApp(app.data).mount("#app");

app.load_data = function() {
    // for checklist page
    axios.get(checklist_data_url).then(response => {
        app.vue.checklist_data = response.data.checklist_data;
        console.log("checklist_data:", app.vue.checklist_data);
        // Perform search if there's a search term in localStorage
        if (app.vue.bird_search.trim() !== '') {
            app.vue.toggle_search();
        }
    }).catch(error => {
        console.error('There was an error fetching the checklist data:', error);
    });
};

app.load_data();
