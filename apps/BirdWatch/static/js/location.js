"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

app.data = {    
    data: function() {
        return {
            location_data: [],
            sampling_event_ids: [],
            graph_rendering: [],
            contributors_minutes: [],
            contributors_obsertvations: [],
            search: [],
            total_stats: [],
            bird_rarity: [],
            common_birds: [],
            rare_birds: [],
            bird_search: '',
            search_active: false,
            location_bounds: null,
            contributors: false,
            total_minutes: 0,
            total_observers: 0,
            total_observations: 0,
            total_bird_count: 0,
            total_birds_observed: 0,
            location_facts: 1,
            sortby: 2,
        };
    },
    methods: {
        // Change Contributors Ranking
        toggle_contributors: function(){
            this.contributors= !this.contributors
            // console.log("time", this.contributors)
        },
        // Search Option for Bird Table
        toggle_search: function(toggle) {
            // console.log("toggle_search");
            this.search_active = !this.search_active;
            if(this.search_active === false && this.bird_search !== '' && toggle === false){
                this.search_active = !this.search_active;
            }
            // console.log(this.bird_search);

            if(this.search_active === true){
                this.search = this.location_data;
                // console.log("filtering_search");
                this.search= this.search.filter(entry => 
                    entry.common_name.toLowerCase().startsWith(this.bird_search.toLowerCase()));
                // console.log(this.search);
            };
            if(this.search_active === false){
                this.bird_search = ''
            }
        },
        // Open Modal for bird graph 
        openModal: function(index, common_name) {
            this.get_graph_info(index, common_name);
        },
        // Close Modal for bird Graph
        closeModal: function(index) {
            // console.log("Closing modal for index:", index);
            document.getElementById('myModal-' + index).classList.remove('is-active');
        },

        // click through facts
        next_facts: function() {
            this.location_facts++;
            if (this.location_facts > 4){
                this.location_facts = 1;
            }
        },
        // sort through the various options
        sorting: function(){
            let dataToSort = this.search_active ? this.search : this.location_data;

            switch (this.sortby) {
                case 1:
                    dataToSort.sort((a, b) => a.common_name.localeCompare(b.common_name));
                    break;
                case 2:
                    dataToSort.sort((a, b) => b.common_name.localeCompare(a.common_name));
                    break;
                case 3:
                    dataToSort.sort((a, b) => a.total_checklist - b.total_checklist);
                    break;
                case 4:
                    dataToSort.sort((a, b) => b.total_checklist - a.total_checklist);
                    break;
                case 5:
                    dataToSort.sort((a, b) => a.total_sightings - b.total_sightings);
                    break;
                case 6:
                    dataToSort.sort((a, b) => b.total_sightings - a.total_sightings);
                    break;
            }

            // Increment sortby and reset if necessary
            this.sortby = (this.sortby % 6) + 1;
            // console.log("This is sortby:",this.sortby)

        },
        // get the x and y axis for the graph
        get_graph_info: function(index, common_name){
            // console.log("graph_rendering")
            // console.log(common_name)
            axios.post(location_graph_data_url,{
                common_name: common_name,
                sampling_event_ids: this.sampling_event_ids
            }).then(response => {
                this.graph_rendering = response.data.location_graph_data;
                // console.log(this.graph_rendering)
                // console.log("Opening modal for index:", index);
                document.getElementById('myModal-' + index).classList.add('is-active');
                this.renderLineGraph(index);
            })
            // console.log(this.graph_rendering)

        },

        // Make the graph
        renderLineGraph: function(index) {
            // console.log("Rendering line graph for index:", index);
        
            // console.log(this.graph_rendering);
        
            const data = this.graph_rendering.map(entry => ({
                date: new Date(entry.observation_date_time), // Convert observation_date_time to Date object
                value: entry.observation_count // Use observation_count as the value
            }));

            // console.log(data);

            
        
            // console.log(data);
        
            // Adjust the width and margins to stretch the graph
            const margin = { top: 20, right: 30, bottom: 30, left: 40 },
                  width = 600 - margin.left - margin.right, // Increase the width
                  height = 400 - margin.top - margin.bottom;
        
            const svg = d3.select(`#lineChart-${index}`)
                .html("") // Clear any existing content
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
        
            const x = d3.scaleTime()
                .domain(d3.extent(data, d => d.date))
                .range([0, width]);
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x));
        
            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.value)])
                .range([height, 0]);
            svg.append("g")
                .call(d3.axisLeft(y));
        
            svg.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                    .x(d => x(d.date))
                    .y(d => y(d.value))
                );
        
            // Add dots
            svg.selectAll("dot")
                .data(data)
                .enter().append("circle")
                .attr("r", 5)
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.value))
                .attr("fill", "steelblue");
        },
    }
};

// function to get the rectangle bounds
function retrieveRectangleBounds() {
    return new Promise((resolve, reject) => {
        // Retrieve rectangle bounds from local storage
        let location_bounds = JSON.parse(localStorage.getItem('rectangleBounds'));
        if (location_bounds) {
            // console.log('Retrieved rectangle bounds:', location_bounds);
            resolve(location_bounds);
        } else {
            // console.log('No rectangle bounds found in local storage.');
            reject(new Error('No rectangle bounds found in local storage.'));
        }
    });
}

// Initialize Vue app
app.vue = Vue.createApp(app.data).mount("#app");

// Function to load data
app.load_data = function () {
    // Call retrieveRectangleBounds function and wait for it to finish before proceeding
    retrieveRectangleBounds().then(location_bounds => {
        // Set location_bounds in Vue instance
        app.vue.location_bounds = location_bounds;
        // console.log("start")
        // console.log("Location bounds:", app.vue.location_bounds);
        // console.log("North East:", app.vue.location_bounds.northEast);
        // console.log("South West:", app.vue.location_bounds.southWest);
        const northEastLat = app.vue.location_bounds.northEast.lat;
        const northEastLng = app.vue.location_bounds.northEast.lng;
        // console.log("North East Latitude:", northEastLat);
        // console.log("North East Longitude:", northEastLng);

        // Accessing latitude and longitude of southWest
        const southWestLat = app.vue.location_bounds.southWest.lat;
        const southWestLng = app.vue.location_bounds.southWest.lng;
        // console.log("South West Latitude:", southWestLat);
        // console.log("South West Longitude:", southWestLng);
        // Access location_bounds from Vue data
        axios.get(location_data_url,{
            params: {
                southWestLat: app.vue.location_bounds.southWest.lat,
                southWestLng: app.vue.location_bounds.southWest.lng,
                northEastLat: app.vue.location_bounds.northEast.lat,
                northEastLng: app.vue.location_bounds.northEast.lng,
            }
        }).then(response => {
            app.vue.location_data = response.data.location_data;
            // console.log("species:", response.data.location_data);
            app.vue.sampling_event_ids = response.data.sampling_event_ids;
            // console.log(response.data.sampling_event_ids);
            app.vue.contributors_minutes = response.data.contributors_minutes;
            // console.log(app.vue.contributors_minutes);
            app.vue.contributors_minutes = app.vue.contributors_minutes.slice(0, 10);
            // console.log(app.vue.contributors_minutes);
            app.vue.contributors_obsertvations = response.data.contributors_obsertvations;
            // console.log(app.vue.contributors_obsertvations);
            app.vue.contributors_obsertvations = app.vue.contributors_obsertvations.slice(0, 10);
            // console.log(app.vue.contributors_obsertvations);
            app.vue.total_stats = response.data.total_stats
            // console.log(app.vue.total_stats);
            app.vue.total_minutes = app.vue.total_stats[0].total_minutes;
            // console.log(app.vue.total_minutes);
            app.vue.total_observers = response.data.total_stats[0].total_observers;
            app.vue.total_observations = response.data.total_stats[0].total_obseravations;
            app.vue.total_bird_count = response.data.bird_stats[0].bird_count;
            // console.log(app.vue.total_bird_count);
            app.vue.total_birds_observed= response.data.bird_stats[0].total_observed
            // console.log(app.vue.total_birds_observed);
            app.vue.bird_rarity = response.data.location_data.map(entry => ({ ...entry })); // Deep copy of objects
            app.vue.bird_rarity.sort((a, b) => a.total_sightings - b.total_sightings);
            // console.log(app.vue.bird_rarity);
            app.vue.rare_birds = app.vue.bird_rarity.slice(0, 5);
            // console.log(app.vue.rare_birds);
            app.vue.common_birds = app.vue.bird_rarity.slice(-5);
            app.vue.common_birds.reverse();
            // console.log(app.vue.common_birds);
            

            // app.vue.sightings = response.data.sightings;
            // console.log(response.data.sightings);
        });
    }).catch(error => {
        console.error('Error retrieving rectangle bounds:', error);
    });


};

// Call the load_data function
app.load_data();
