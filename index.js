#!/usr/bin/env node

// *** flights2mqtt - Flight Tracking to MQTT Service **************************
const { FlightRadar24API } = require('flightradarapi');
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
const airports = require('./airports.json');

// ==================== CONFIGURATION ==========================================
let CONFIG;
try {
    const configPath = path.join(__dirname, 'config.json');
    const configFile = fs.readFileSync(configPath, 'utf8');
    CONFIG = JSON.parse(configFile);
    console.log('✓ Configuration loaded from config.json');
} catch (error) {
    console.error('ERROR: Could not load config.json');
    console.error(error.message);
    process.exit(1);
}

// ==================== FLIGHT RADAR API =======================================
const flightRadar = new FlightRadar24API();

// ==================== MQTT CLIENT ============================================
let mqttClient = null;

function connectMQTT() {
    console.log(`Connecting to MQTT broker at ${CONFIG.mqtt.broker}...`);

    mqttClient = mqtt.connect(CONFIG.mqtt.broker, {
        port: CONFIG.mqtt.port,
        clientId: CONFIG.mqtt.clientId
    });

    mqttClient.on('connect', () => {
        console.log('✓ Connected to MQTT broker');
        console.log(`Publishing to topic: ${CONFIG.mqtt.topic}`);
    });

    mqttClient.on('error', (error) => {
        console.error('MQTT Error:', error.message);
    });

    mqttClient.on('offline', () => {
        console.log('MQTT client offline - attempting reconnect...');
    });
}

// ==================== FLIGHT TRACKING ========================================
async function getFlightsInArea() {
    try {
        console.log('\n--- Fetching flights ---');
        console.log(`Area: ${CONFIG.tracking.latitude}, ${CONFIG.tracking.longitude}`);
        console.log(`Radius: ${CONFIG.tracking.radius}km`);
        console.log(`Airport: ${CONFIG.tracking.airport}`);

        // Get bounds for the area
        const bounds = getBounds(
            CONFIG.tracking.latitude,
            CONFIG.tracking.longitude,
            CONFIG.tracking.radius
        );

        // Fetch flights in bounds - API expects bounds as string
        const boundsString = `${bounds.tl_y},${bounds.br_y},${bounds.tl_x},${bounds.br_x}`;
        const flights = await flightRadar.getFlights(null, boundsString);
        console.log(`Found ${flights.length} flights in area`);

        // Airport info
        const airport = await flightRadar.getAirport(CONFIG.tracking.airport);

        // Filter flights by airport and enrich with details
        const filteredFlights = [];

        for (const flight of flights) {
            //console.log(flight);

            const origin = flight.originAirportIata || '';
            const destination = flight.destinationAirportIata || '';

            const matches = origin === CONFIG.tracking.airport ||
                destination === CONFIG.tracking.airport;

            // Log flights that don't match with full details
            if (!matches) {
                const info = extractFlightInfo(flight);
                console.log(`  ✗ FILTERED: ${info.flightNumber}`);
                console.log(`    Flag: ${info.flag}, Reg: ${info.registration}`);
                console.log(`    Aircraft: ${info.aircraftType}, Airline: ${info.airline}`);
                console.log(`    Route: ${info.departure} → ${info.arrival}`);
                console.log(`    Alt: ${info.altitude}ft, Speed: ${info.speed}kts, Status: ${info.status}`);
            } else {
                filteredFlights.push(flight);
            }
        }

        console.log(`${filteredFlights.length} flights match airport ${CONFIG.tracking.airport}`);

        // Process and publish each flight
        for (const flight of filteredFlights) {
            const details = await flightRadar.getFlightDetails(flight);
            const data = extractFlightData(airport, flight, details);
            // console.log(data);
            publishFlightData(data);
        }

        return filteredFlights.length;

    } catch (error) {
        console.error('Error fetching flights:', error.message);
        return 0;
    }
}

// Calculate bounding box for given position and radius
function getBounds(lat, lon, radiusKm) {
    const latChange = radiusKm / 111.32; // 1 degree latitude ≈ 111.32 km
    const lonChange = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));

    return {
        tl_y: lat + latChange,    // top latitude
        tl_x: lon - lonChange,    // left longitude
        br_y: lat - latChange,    // bottom latitude
        br_x: lon + lonChange     // right longitude
    };
}

// Extract relevant flight Info
function extractFlightInfo(flight) {
    return {
        flag: flight.airlineIcao || flight.airlineIata || 'Unknown',
        registration: flight.registration || 'N/A',
        flightNumber: flight.number || flight.callsign || 'N/A',
        aircraftType: flight.aircraftCode || 'Unknown',
        airline: flight.airlineIata || flight.airlineIcao || 'Unknown',
        altitude: flight.altitude || 0,
        speed: flight.groundSpeed || 0,
        departure: flight.originAirportIata || 'N/A',
        arrival: flight.destinationAirportIata || 'N/A',
        status: flight.onGround ? 'on-ground' : 'en-route'
    };
}

// Extract relevant flight Data
function extractFlightData(airport, flight, details) {
    return {
        flight: flight.number || 'NaN',
        callsign: details.identification.callsign || 'N/A',
        status: {
            state: flight.onGround ? 'on-ground' : 'en-route',
            icon: details.status.icon || 'N/A',
            text: details.status.text || 'N/A'
        },
        aircraft: {
            model: details.aircraft.model.text || 'N/A',
            image: details.aircraft.images?.thumbnails?.[0]?.src || 'N/A',
            registration: flight.registration || 'N/A',
        },
        airline: {
            name: details.airline.name ||'N/A',
            short: details.airline.short || 'N/A',
            iata: details.airline.code.iata || 'N/A',
            icao: details.airline.code.icao || 'N/A'
        },
        departure: {
            city: details.airport.origin.position.region.city || 'N/A',
            iata: details.airport.origin.code.iata || 'N/A',
            icao: details.airport.origin.code.icao || 'N/A',
            flag: airports[details.airport.origin.code.icao] || 'none'
        },
        arrival: {
            city: details.airport.destination.position.region.city || 'N/A',
            iata: details.airport.destination.code.iata || 'N/A',
            icao: details.airport.destination.code.icao || 'N/A',
            flag: airports[details.airport.destination.code.icao] || 'N/A'
        },
        scheduled: {
            departure: details.time.scheduled.departure || 'N/A',
            arrival: details.time.scheduled.arrival || 'N/A'
        },
        estimated: {
            departure: details.time.real.departure || 'N/A',
            arrival: details.time.estimated.arrival || 'N/A'
        },
        altitude: flight.altitude || 0,
        speed: flight.groundSpeed || 0,
        distance: flight.getDistanceFrom(airport),
        timestamp: new Date().toISOString()
    };
}

// Publish flight Data to MQTT
function publishFlightData(flightData) {
    if (!mqttClient || !mqttClient.connected) {
        console.warn('MQTT not connected, skipping publish');
        return;
    }

    const topic = `${CONFIG.mqtt.topic}/${flightData.flight}`;
    const payload = JSON.stringify(flightData, null, 2);

    mqttClient.publish(topic, payload, { qos: 0, retain: false }, (error) => {
        if (error) {
            console.error(`Failed to publish ${flightData.flight}:`, error.message);
        } else {
            console.log(`✓ Published: ${flightData.flight} (${flightData.departure} → ${flightData.arrival})`);
        }
    });
}

// ==================== MAIN LOOP ==============================================
function startTracking() {
    console.log('\n========================================');
    console.log('  flights2mqtt - Flight Tracker Started');
    console.log('========================================');
    console.log(`Interval: ${CONFIG.tracking.interval / 1000} seconds`);
    console.log(`Target Airport: ${CONFIG.tracking.airport}`);
    console.log('========================================\n');

    // Initial fetch
    getFlightsInArea();

    // Set up interval
    setInterval(() => {
        getFlightsInArea();
    }, CONFIG.tracking.interval);
}

// ==================== STARTUP ================================================
async function main() {
    // Connect to MQTT
    connectMQTT();

    // Wait a bit for MQTT connection
    setTimeout(() => {
        startTracking();
    }, 2000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down gracefully...');
    if (mqttClient) {
        mqttClient.end();
    }
    process.exit(0);
});

// Start the service
main().catch(console.error);
