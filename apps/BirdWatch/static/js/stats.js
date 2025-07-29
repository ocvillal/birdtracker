"use strict";

let app = {};

app.data = {
    data: function() {
        return {
            total_minutes: 0,
            num_sightings: 0,
            sightings_per_day: [], 
            most_viewed_bird_common_name: '',
            currentSpecies: '',
            species_sightings: [],
            timing_data: null, 
            searchQuery: '', 
            currentPage: 1, 
            entriesPerPage: 10,
            showModal: false
        };
    },
    computed: {
        filteredSpeciesSightings: function() {
            let query = this.searchQuery.toLowerCase();
            // Check if this.species_sightings is defined before filtering
            if (this.species_sightings) {
                return this.species_sightings.filter(row => {
                    // Check if row.sightings is defined before accessing common_name
                    if (row.sightings) {
                        return row.sightings.common_name.toLowerCase().includes(query);
                    }
                    return false;
                });
            }
            return [];
        },
        totalPages: function() {
            // Check if this.filteredSpeciesSightings is defined before accessing its length
            if (this.filteredSpeciesSightings) {
                return Math.ceil(this.filteredSpeciesSightings.length / this.entriesPerPage);
            }
            return 0;
        },
        paginatedSpeciesSightings: function() {
            // Check if this.filteredSpeciesSightings is defined before slicing it
            if (this.filteredSpeciesSightings) {
                let start = (this.currentPage - 1) * this.entriesPerPage;
                let end = start + this.entriesPerPage;
                return this.filteredSpeciesSightings.slice(start, end);
            }
            return [];
        }
    },
    methods: {
        // Method to show timing and date details
        showTiming: function(speciesName, sightingId, totalSightings) {
            axios.get(get_timing_url, {
                params: {
                    species_name: speciesName,
                    sighting_id: sightingId, // Use sighting_id instead of species_id
                    observation_count: totalSightings
                }
            }).then(response => {
                // Update timing_data with the response from the server
                this.timing_data = response.data.timing_data;
                this.currentSpecies = speciesName;
                this.observation_count = response.data.observation_count;
                // console.log("OBS COUNT: ", this.observation_count);
                // console.log("JS SIGHTING ID: ", sightingId);
                // Show the pop-up modal
                this.showPopup();
                // console.log("TIME DATA: ", this.timing_data);
            }).catch(error => {
                console.error('Error fetching timing data:', error);
            });
        },
        // Method to show the pop-up
        showPopup: function() {
            let modal = document.getElementById("popupModal");
            modal.classList.add("is-active");
            
            // Add event listener to modal background to close pop-up
            let modalBackground = document.querySelector(".modal-background");
            modalBackground.addEventListener("click", this.closePopup);
        },
        // Method to close the pop-up
        closePopup: function() {
            let modal = document.getElementById("popupModal");
            modal.classList.remove("is-active");
        },
        // Pagination methods
        setPage: function(page) {
            this.currentPage = page;
        },
        nextPage: function() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
            }
        },
        prevPage: function() {
            if (this.currentPage > 1) {
                this.currentPage--;
            }
        },
        // Method to fetch sightings per day data
        fetchSightingsPerDay: function() {
            axios.get(get_sightings_per_day_url)
                .then(response => {
                    this.sightings_per_day = response.data.sightings_per_day;
                    // console.log("SIGHTINGS PER DAY: ", this.sightings_per_day);
                    // Call method to plot chart after data is fetched
                    this.plotSightingsPerDayChart();
                })
                .catch(error => {
                    console.error('Error fetching sightings per day data:', error);
                });
        },
        // Method to plot sightings per day chart
plotSightingsPerDayChart: function() {
    let ctx = document.getElementById('sightingsPerDayChart').getContext('2d');
    let labels = Object.keys(this.sightings_per_day);
    let data = Object.values(this.sightings_per_day);
    
    // Create a gradient for the bars
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(54, 162, 235, 0.6)');
    gradient.addColorStop(1, 'rgba(75, 192, 192, 0.2)');
    
    let chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sightings per Day',
                data: data,
                backgroundColor: gradient,
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                borderRadius: 5, // Rounded corners
                borderSkipped: false // Rounded corners
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(200, 200, 200, 0.2)',
                        borderDash: [5, 5]
                    },
                    title: {
                        display: true,
                        text: 'Number of Sightings',
                        font: {
                            size: 18,
                            weight: 'bold',
                            family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
                        },
                        color: '#333'
                    },
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 14,
                            family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
                        },
                        color: '#333'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(200, 200, 200, 0.2)',
                        borderDash: [5, 5]
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        font: {
                            size: 18,
                            weight: 'bold',
                            family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
                        },
                        color: '#333'
                    },
                    ticks: {
                        font: {
                            size: 14,
                            family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
                        },
                        color: '#333'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            size: 14,
                            family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
                        },
                        color: '#333'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 16,
                        family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 14,
                        family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
                    },
                    bodyColor: '#fff',
                    titleColor: '#fff',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }
            }
        }
    });
}

    }
};

app.vue = Vue.createApp(app.data).mount("#app");

// Load initial data and fetch sightings per day data
app.vue.load_data = function () {
    axios.get(get_stats_url)
        .then(response => {
            this.total_minutes = response.data.total_minutes;
            this.num_sightings = response.data.num_sightings;
            this.most_viewed_bird_common_name = response.data.most_viewed_bird_common_name;
            this.species_sightings = response.data.species_sightings;
            // Fetch sightings per day data after loading initial data
            this.fetchSightingsPerDay();
        })
        .catch(error => {
            console.error('Error fetching initial data:', error);
        });
};

app.vue.load_data();
