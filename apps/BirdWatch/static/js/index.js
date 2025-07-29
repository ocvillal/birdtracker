"use strict";

let app = {};

function initMap() {
    app.data.map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 37.402306700847795, lng: -121.07439742297052 },
        zoom: 8,
        gestureHandling: 'greedy'
    });

    app.data.drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['rectangle']
        }
    });
    app.data.drawingManager.setMap(app.data.map);
    app.data.drawingManager.setDrawingMode(null);

    // Initialize the heatmap property
    app.data.heatmap = new google.maps.visualization.HeatmapLayer({
        data: [],
        opacity: 1,
        gradient: [
            'rgba(0, 255, 255, 0)',
            'rgba(0, 255, 255, 1)',
            'rgba(0, 191, 255, 1)',
            'rgba(0, 127, 255, 1)',
            'rgba(0, 63, 255, 1)',
            'rgba(0, 0, 255, 1)',
            'rgba(0, 0, 223, 1)',
            'rgba(0, 0, 191, 1)',
            'rgba(0, 0, 159, 1)',
            'rgba(0, 0, 127, 1)',
            'rgba(63, 0, 91, 1)',
            'rgba(127, 0, 63, 1)',
            'rgba(191, 0, 31, 1)',
            'rgba(255, 0, 0, 1)'
        ]
    });
    app.data.heatmap.setMap(app.data.map);

    // Load bird data and convert to heatmap format
    axios.get(load_data_url).then((response) => {
        const birdData = response.data.bird_data;
        const heatmapData = birdData.map(bird => new google.maps.LatLng(bird.latitude, bird.longitude));

        app.data.heatmap.setData(heatmapData);

        // Fetch bird species list and populate the table
        axios.get(bird_data_url).then(speciesResponse => {
            console.log('Species response:', speciesResponse); // Log the entire response
            const birdSpecies = speciesResponse.data.species;
            console.log('Bird species:', birdSpecies); // Log the bird species array

            birdSpecies.sort((a, b) => a.common_name.localeCompare(b.common_name));
            const tableBody = document.getElementById('birdSpeciesTableBody');

            if (Array.isArray(birdSpecies) && birdSpecies.length > 0) {
                birdSpecies.forEach((species, index) => {
                    // Skip the header which worked its way in here somehow
                    if (species.common_name == 'COMMON NAME') return;

                    const row = document.createElement('tr');
                    const commonNameCell = document.createElement('td');
                    commonNameCell.textContent = species.common_name;
                    row.appendChild(commonNameCell);
                    tableBody.appendChild(row);

                    // Add click event listener to each row
                    row.addEventListener('click', () => {
                        console.log('Clicked species:', species.common_name);
                        fetchSightings(species.common_name, app);
                    });                    

                    // Add hover effect to each row
                    row.addEventListener('mouseover', () => {
                        row.style.backgroundColor = '#f0f0f0'; // Change background color on hover
                        row.style.cursor = 'pointer'; // Change cursor to pointer on hover
                    });

                    row.addEventListener('mouseout', () => {
                        row.style.backgroundColor = ''; // Remove background color on hover out
                        row.style.cursor = ''; // Reset cursor style on hover out
                    });
                });
            } else {
                console.log(birdSpecies);
                const row = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.textContent = 'No data available';
                row.appendChild(noDataCell);
                tableBody.appendChild(row);
            }
        }).catch(error => {
            console.error('Error fetching bird species:', error);
            const tableBody = document.getElementById('birdSpeciesTableBody');
            const row = document.createElement('tr');
            const errorCell = document.createElement('td');
            errorCell.textContent = 'Error fetching data';
            row.appendChild(errorCell);
            tableBody.appendChild(row);
        });
    }).catch(error => {
        console.error('Error loading bird data:', error);
    });

    google.maps.event.addListener(app.data.drawingManager, 'overlaycomplete', (event) => {
        if (event.type == google.maps.drawing.OverlayType.RECTANGLE) {
            try {
                const bounds = event.overlay.getBounds();
                const ne = bounds.getNorthEast(); // northeast corner
                const sw = bounds.getSouthWest(); // southwest corner

                app.data.rectangleBounds = {
                    northEast: { lat: ne.lat(), lng: ne.lng() },
                    southWest: { lat: sw.lat(), lng: sw.lng() }
                };

                console.log('Rectangle bounds:', app.data.rectangleBounds);
            } catch (error) {
                console.error('Error getting rectangle bounds:', error);
            }
        }
    });

    centerMapOnUserLocation();

    google.maps.event.addListener(app.data.map, 'click', (event) => {
        handleMapClick(event.latLng.lat(), event.latLng.lng());
    });

    function handleMapClick(latitude, longitude) {
        // Redirect to the form page with latitude and longitude parameters
        window.location.href = `/BirdWatch/form?lat=${latitude}&lng=${longitude}`;
    }

    function fetchSightings(speciesName, app) {
        axios.get(get_sightings_url).then(response => {
            const sightingsData = response.data.sightings;
            const heatmapData = sightingsData.map(sighting => new google.maps.LatLng(sighting.latitude, sighting.longitude));
    
            // Clear existing heatmap and create a new one with updated data
            app.data.heatmap.setMap(null);
            app.data.heatmap = new google.maps.visualization.HeatmapLayer({
                data: heatmapData,
                opacity: 1,
                gradient: [
                    'rgba(0, 255, 255, 0)',
                    'rgba(0, 255, 255, 1)',
                    'rgba(0, 191, 255, 1)',
                    'rgba(0, 127, 255, 1)',
                    'rgba(0, 63, 255, 1)',
                    'rgba(0, 0, 255, 1)',
                    'rgba(0, 0, 223, 1)',
                    'rgba(0, 0, 191, 1)',
                    'rgba(0, 0, 159, 1)',
                    'rgba(0, 0, 127, 1)',
                    'rgba(63, 0, 91, 1)',
                    'rgba(127, 0, 63, 1)',
                    'rgba(191, 0, 31, 1)',
                    'rgba(255, 0, 0, 1)'
                ]
            });
            app.data.heatmap.setMap(app.data.map);
        }).catch(error => {
            console.error('Error fetching sightings:', error);
        });
    }
}

function centerMapOnUserLocation() {
    // Check if Geolocation is supported by the browser
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLatLng = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                app.data.map.setCenter(userLatLng);
                app.data.map.setZoom(8); // Adjust zoom level as needed
            },
            (error) => {
                console.error('Error getting user location:', error);
            }
        );
    } else {
        console.error('Geolocation is not supported by this browser.');
    }
}

let init = (app) => {

    app.data = {
        map: null, // Google Map instance
        drawingManager: null, // Drawing Manager instance
        heatmap: null, // Heatmap Layer instance
        bird_data: [], // Array to hold bird data
        rectangleBounds: null, // Stores the bounds of the selected rectangle
        isDrawingMode: false, // Indicates whether the drawing mode is active
    };

    app.methods = {
        showStatistics: function () {
            if (this.rectangleBounds) {
                localStorage.setItem('rectangleBounds', JSON.stringify(this.rectangleBounds));
                window.location.href = '/BirdWatch/location';
            } else {
                console.log('No selection to show statistics for.');
            }
        },
        resetMap: function () {
            initMap();
        },
        toggleTool: function () {
            if (this.isDrawingMode) {
                this.drawingManager.setDrawingMode(null);
                this.isDrawingMode = false;
            } else {
                this.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
                this.isDrawingMode = true;
            }
        }
    };

    app.computed = {
        toolButtonText: function () {
            return this.isDrawingMode ? 'Hand/Pan Tool' : 'Drawing Tool';
        },
        toolButtonClass: function () {
            return this.isDrawingMode ? 'is-info' : 'is-primary';
        }
    };

    app.vue = Vue.createApp({
        data: () => app.data,
        methods: app.methods,
        computed: app.computed,
    }).mount("#app");
};

init(app);
