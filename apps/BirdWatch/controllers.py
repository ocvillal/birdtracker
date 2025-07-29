"""
This file defines actions, i.e. functions the URLs are mapped into.
The @action(path) decorator exposes the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply:

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template.
@action.uses(session)         indicates that the action uses the session.
@action.uses(db)              indicates that the action uses the db.
@action.uses(T)               indicates that the action uses the i18n & pluralization.
@action.uses(auth.user)       indicates that the action requires a logged in user.
@action.uses(auth)            indicates that the action requires the auth object.

session, db, T, auth, and templates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior.
"""

from py4web import action, request, abort, redirect, URL
from yatl.helpers import A
from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash
from py4web.utils.url_signer import URLSigner
from .models import get_user_email
import uuid
from datetime import date

url_signer = URLSigner(session)

@action('index')
@action.uses('index.html', db, auth, url_signer)
def index():
    return dict(
        # COMPLETE: return here any signed URLs you need.
        my_callback_url = URL('my_callback', signer=url_signer),
        location_url=URL('location'),
        load_data_url=URL('map_data', signer=url_signer),
        card_data_url=URL('card_data', signer=url_signer),
        bird_data_url=URL('bird_species', signer=url_signer),
        get_sightings_url=URL('get_sightings_by_species',signer=url_signer),
    )

@action('map_data')
@action.uses(db, auth)
def map_data():
    bird_data = db(db.checklists).select(db.checklists.latitude, db.checklists.longitude).as_list()
    return dict(bird_data=bird_data)

@action('bird_species')
@action.uses(db)
def bird_species():
    species = db(db.species).select(db.species.common_name).as_list()
    return dict(species=species)

@action('get_sightings_by_species')
@action.uses(db)
def get_sightings_by_species():
    species_name = request.query.get('species_name', None)
    if species_name:
        # Query sightings based on common name
        sightings = db(db.sightings.common_name == species_name).select(
            db.sightings.latitude, db.sightings.longitude
        ).as_list()
        return dict(sightings=sightings)
    else:
        return dict(error="Species name not provided")

@action('card_data')
@action.uses(db, auth)
def card_data():
    species_sightings = db(db.sightings).select(
        db.sightings.common_name.with_alias('common_name'),
        db.sightings.sampling_event_id.count().with_alias('total_checklist'),
        db.sightings.observation_count.sum().with_alias('total_sightings'),
        groupby=db.sightings.common_name
    ).as_list()
    return dict(species_sightings=species_sightings)

# location controls ---------------------------------------------------------------------------------------
@action('location')
@action.uses('location.html', db, auth, url_signer)
def location():
    return dict(
        location_url=URL('location'),
        location_data_url=URL('location_data'),
        location_graph_data_url=URL('location_graph_data')
        )

@action('location_data', method="GET")
@action.uses(db, auth)
def location_data():
    south_west_x = request.query.get('southWestLat')
    south_west_y = request.query.get('southWestLng')
    north_east_x = request.query.get('northEastLat')
    north_east_y = request.query.get('northEastLng')

    # print(db(db.checklists).select())

    sampling_event_ids = db((db.checklists.latitude >= south_west_x) &
                            (db.checklists.latitude <= north_east_x) &
                            (db.checklists.longitude >= south_west_y) &
                            (db.checklists.longitude <= north_east_y)
                           ).select(db.checklists.sampling_event_id)
    # print(sampling_event_ids)
    sampling_event_ids = [row.sampling_event_id for row in sampling_event_ids]

    # print(sampling_event_ids)

    # print("location_bounds")
    species_sightings = db(db.sightings.sampling_event_id.belongs(sampling_event_ids)).select(
        db.sightings.common_name.with_alias('common_name'),
        db.sightings.sampling_event_id.count().with_alias('total_checklist'),
        db.sightings.observation_count.sum().with_alias('total_sightings'),
        groupby=db.sightings.common_name
    ).as_list()

    # print(species_sightings)

    # Simplified query to debug contributors
    contributors = db(db.checklists.sampling_event_id.belongs(sampling_event_ids)).select(
        db.checklists.observer_id.with_alias('observer'),
        db.checklists.duration_minutes.sum().with_alias('total_minutes'),
        db.checklists.observation_date_time.count().with_alias('total_obseravation'),
        groupby=db.checklists.observer_id
    ).as_list()

    contributors_minutes = sorted(contributors, key=lambda x: -x['total_minutes'])
    contributors_obsertvations= sorted(contributors, key=lambda x: -x['total_obseravation'])

    total_stats = db(db.checklists.sampling_event_id.belongs(sampling_event_ids)).select(
        db.checklists.duration_minutes.sum().with_alias('total_minutes'),
        db.checklists.observer_id.count(distinct=True).with_alias('total_observers'),
        db.checklists.observation_date_time.count().with_alias('total_obseravations'),
    ).as_list()

    bird_stats = db(db.sightings.sampling_event_id.belongs(sampling_event_ids)).select(
        db.sightings.common_name.count(distinct = True).with_alias('bird_count'),
        db.sightings.observation_count.sum().with_alias('total_observed'),
    ).as_list()

    return dict(location_data=species_sightings, 
                sampling_event_ids=sampling_event_ids, 
                contributors_minutes=contributors_minutes, 
                contributors_obsertvations=contributors_obsertvations,
                total_stats=total_stats,
                bird_stats=bird_stats)

@action('location_graph_data', method="POST")
@action.uses(db, auth)
def location_graph_data():
    sampling_event_ids = request.json.get('sampling_event_ids')
    common_name = request.json.get('common_name')  # Accessing query parameter
    # print(common_name)
    sightings = db((db.sightings.common_name == common_name)&
                   (db.sightings.sampling_event_id.belongs(sampling_event_ids))).select(
        db.sightings.sampling_event_id,
        db.sightings.observation_count
        )
    # print(sightings)
    
    sampling_event_ids = [row.sampling_event_id for row in sightings]

    # Fetch dates from checklists using the sampling_event_ids
    checklists = db(db.checklists.sampling_event_id.belongs(sampling_event_ids)).select(
        db.checklists.sampling_event_id,
        db.checklists.observation_date_time
    )

    # print(checklists)
    # Combine the data
    location_graph_data = []
    for sighting in sightings:
        matching_checklists = [cl for cl in checklists if cl.sampling_event_id == sighting.sampling_event_id]
        for checklist in matching_checklists:
            # Check if observation_date_time already exists in location_graph_data
            existing_data_index = next((i for i, item in enumerate(location_graph_data) if item["observation_date_time"] == checklist.observation_date_time), None)
            if existing_data_index is not None:
                # If observation_date_time exists, update observation_count
                location_graph_data[existing_data_index]["observation_count"] += sighting.observation_count
            else:
                # If observation_date_time does not exist, add new entry
                location_graph_data.append({
                    "observation_count": sighting.observation_count,
                    "observation_date_time": checklist.observation_date_time
                })

    location_graph_data = sorted(location_graph_data, key=lambda x: x['observation_date_time'])
    # print(location_graph_data)


    return dict(location_graph_data = location_graph_data)
    

# location controls end---------------------------------------------------------------------------------------


# Stats Controls----------------------------------------------------------------------------------------------

@action('stats')
@action.uses('stats.html', db, auth, url_signer)
def stats():
    if not auth.get_user():
        redirect(URL('auth/login'))
    
    return dict(
        get_stats_url = URL('get_stats'),
        get_timing_url = URL('get_timing'),
        get_sightings_per_day_url= URL('get_sightings_per_day')      
    )

@action('get_stats')
@action.uses(db, auth, url_signer)
def get_stats():
    # Get the logged-in user's email
    user_email = get_user_email()
    
    # Retrieve the observer_id associated with the user_email
    result = db(db.checklists.observer_id == user_email).select(db.checklists.observer_id).first()
    observer_id = result.observer_id if result else None
    
    # If observer_id is not found, return an error message
    if not observer_id:
        return dict(error="Observer ID not found for the logged-in user's email.")
    
    # Retrieve the sum of all minutes for all species observed by the logged-in user
    total_minutes = db(db.checklists.observer_id == observer_id).select(
        db.checklists.duration_minutes.sum().with_alias('total_minutes')
    ).first().total_minutes or 0
    
    # Retrieve all sampling_event_ids associated with the observer
    sampling_event_ids = db(db.checklists.observer_id == observer_id).select(db.checklists.sampling_event_id)
    sampling_event_id_list = [row.sampling_event_id for row in sampling_event_ids]
    
    # Retrieve the total number of sightings
    num_sightings = db(db.sightings.sampling_event_id.belongs(sampling_event_id_list)).count()
    
    # Example of aggregation: Count sightings per species for the logged-in user
    species_sightings = db(db.sightings.sampling_event_id.belongs(sampling_event_id_list)).select(
        db.sightings.common_name, 
        db.sightings.sampling_event_id,  # Ensure this is selected
        db.sightings.observation_count.sum().with_alias('total_sightings'),
        groupby=[db.sightings.common_name, db.sightings.sampling_event_id]  # Group by both common_name and sampling_event_id
    )

    most_viewed_bird = max(species_sightings, key=lambda x: x.total_sightings) if species_sightings else None
    most_viewed_bird_common_name = most_viewed_bird.sightings.common_name if most_viewed_bird else None
    # print("Most viewed bird:", most_viewed_bird_common_name)
    
    return dict(
        total_minutes=total_minutes,
        num_sightings=num_sightings,
        most_viewed_bird_common_name=most_viewed_bird_common_name,
        species_sightings=species_sightings.as_list()  # Convert to list for better JSON serialization
    )

@action('get_timing')
@action.uses(db, auth, url_signer)
def get_timing():
    species_name = request.params.get('species_name')
    sighting_id = request.params.get('sighting_id')
    
    if not species_name or not sighting_id:
        return dict(timing_data=None, observation_count=None)

    # Query to retrieve timing data
    timing_data = db((db.checklists.sampling_event_id == sighting_id)).select(
        db.checklists.observation_date_time
    ).first()

    # Query to retrieve observation count for the specific sampling event ID
    observation_count = db(db.sightings.sampling_event_id == sighting_id).select(
        db.sightings.observation_count
    ).first()

    if timing_data:
        formatted_date = timing_data.observation_date_time.strftime("%B %d, %Y at %I:%M%p")
        timing_data_result = formatted_date
    else:
        timing_data_result = None

    if observation_count:
        observation_count_result = observation_count.observation_count
        # print("OBSERV COUNT: ", observation_count_result)
    else:
        observation_count_result = None

    return dict(timing_data=timing_data_result, observation_count=observation_count_result)

    
@action('get_sightings_per_day')
@action.uses(db, auth, url_signer)
def get_sightings_per_day():
    # Get the logged-in user's email
    user_email = get_user_email()
    
    # Retrieve the observer_id associated with the user_email
    result = db(db.checklists.observer_id == user_email).select(db.checklists.observer_id).first()
    observer_id = result.observer_id if result else None
    
    # If observer_id is not found, return an error message
    if not observer_id:
        return dict(error="Observer ID not found for the logged-in user's email.")
    
    # Retrieve all sampling_event_ids associated with the observer
    sampling_event_ids = db(db.checklists.observer_id == observer_id).select(db.checklists.sampling_event_id)
    sampling_event_id_list = [row.sampling_event_id for row in sampling_event_ids]
    
    # Retrieve the checklists with their observation date
    checklists_with_dates = db(db.checklists.sampling_event_id.belongs(sampling_event_id_list)).select(
        db.checklists.observation_date_time
    )

    # Count sightings per day
    sightings_per_day = {}
    for checklist in checklists_with_dates:
        # Extract date component from observation_date_time
        observation_date = checklist.observation_date_time
        # Convert date object to string for JSON serialization
        observation_date_str = observation_date.isoformat()
        if observation_date_str in sightings_per_day:
            sightings_per_day[observation_date_str] += 1
        else:
            sightings_per_day[observation_date_str] = 1

    # print("SIGHTINGS/DAY: ", sightings_per_day)
    
    return dict(sightings_per_day=sightings_per_day)

# Stats Controls End----------------------------------------------------------------------------------------------


# Checklist ___________________________________________________
@action('checklist')
@action.uses('checklist.html', db, auth)
def checklist():
    # redirect to the login page if not signed in
    if not auth.current_user:
        redirect(URL('auth/login'))
    return dict(
        checklist_data_url=URL('checklist_data'),
        my_checklist_url=URL('my_checklist'),
        update_sightings_url=URL('update_sightings', signer=url_signer)
    )

# query of sightings db for checklist page
@action('checklist_data', method="GET")
@action.uses(db, auth)
def checklist_data():
    species_sightings = db(db.sightings).select(
        db.sightings.common_name.with_alias('common_name'),
        db.sightings.sampling_event_id.count().with_alias('total_checklist'),
        db.sightings.observation_count.sum().with_alias('total_sightings'),
        groupby=db.sightings.common_name
    ).as_list()
    return dict(checklist_data=species_sightings)

# updating sighting counter
@action('update_sightings', method=["POST"])
@action.uses(db, auth, url_signer.verify())
def update_sightings():
    common_name = request.json.get('common_name')
    new_sightings = request.json.get('new_sightings')

    if common_name is None or new_sightings is None:
        abort(400, "Invalid request")

    sighting = db(db.sightings.common_name == common_name).select().first()

    if sighting:
        sighting.update_record(observation_count=sighting.observation_count + new_sightings)
        total_sightings = sighting.observation_count
    else:
        total_sightings = new_sightings
        db.sightings.insert(common_name=common_name, observation_count=total_sightings)

    return dict(total_sightings=total_sightings)

@action('my_checklist')
@action.uses('my_checklist.html', db, auth.user)
def my_checklist():
    # redirect to the login page if not signed in
    if not auth.current_user:
        redirect(URL('auth/login'))

    return dict(
        my_checklist_data_url=URL('my_checklist_data'),
        form_url=URL('form'),
        delete_entry_url=URL('delete_entry'),
        )

@action('my_checklist_data', method="GET")
@action.uses(db, auth.user)
def my_checklist_data():
    user_email = str(get_user_email())
    # print(f"Fetching data for user: {user_email}")  # Log the user email
    # print(f"Observer_id: {db(db.checklists.observer_id)}")
    
    observer_info = db(db.checklists.observer_id == user_email).select(
    # observer_info = db(db.checklists).select(
        db.checklists.sampling_event_id.with_alias('sampling_event_id'),
        db.checklists.latitude.with_alias('latitude'),
        db.checklists.longitude.with_alias('longitude'),
        db.checklists.observation_date_time.with_alias('observation_date_time'),
        db.checklists.duration_minutes.with_alias('duration_minutes'),
        db.checklists.observer_id.with_alias('observer_id'),
    ).as_list()
    
    # print(f"Observer Info: {observer_info}")  # Log the fetched data
    # if not observer_info:
    #     print("No data found for the user.")
    
    return dict(my_checklist_data=observer_info)

@action('form')
@action.uses('form.html', db, auth.user)
def form():
    # redirect to the login page if not signed in
    if not auth.current_user:
        redirect(URL('auth/login'))
    return dict (
        add_checklist_url=URL('add_checklist'),
        my_checklist_url=URL('my_checklist'),
    )

# add a new entry and update checklists, sightings, and species database
@action('add_checklist', method="POST")
@action.uses(db, auth.user)
def add_checklist():
    data = request.json
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    observation_date_time = data.get('observation_date_time')
    duration_minutes = data.get('duration_minutes')
    common_name = data.get('common_name')
    sighting_count = data.get('sighting_count')
    observer_id = str(get_user_email())

    # print("Latitude:", latitude)
    # print("Longitude:", longitude)
    # print("Observation Date Time:", observation_date_time)
    # print("Duration Minutes:", duration_minutes)
    # print("Common Name:", common_name)
    # print("Sighting Count:", sighting_count)
    # print("Observer ID:", observer_id)

    if not latitude or not longitude or not observation_date_time or not duration_minutes or not common_name or not sighting_count:
        abort(400, "Missing fields in the form")

    # Generate a unique sampling_event_id using uuid
    sampling_event_id = str(uuid.uuid4())

    # Insert a new checklist entry with the generated sampling_event_id
    checklist_id = db.checklists.insert(
        sampling_event_id=sampling_event_id,
        latitude=latitude,
        longitude=longitude,
        observation_date_time=observation_date_time,
        duration_minutes=duration_minutes,
        observer_id=observer_id
    )
    # print("Inserted checklist with ID:", checklist_id, "and sampling_event_id:", sampling_event_id)

    # Check if the species exists in the species database, if not, add it
    species = db(db.species.common_name == common_name).select().first()
    if not species:
        species_id = db.species.insert(common_name=common_name)
        # print("Inserted species with ID:", species_id)

    # Insert a new sighting entry with the same sampling_event_id
    sighting_id = db.sightings.insert(
        sampling_event_id=sampling_event_id,
        common_name=common_name,
        observation_count=sighting_count
    )
    db.commit()
    # print("Inserted sighting with ID:", sighting_id, "and sampling_event_id:", sampling_event_id)
    return dict(success=True)

# Delete an entry from checklists, sightings, and species database
@action('delete_entry', method='POST')
@action.uses(db, auth.user)
def delete_entry():
    sampling_event_id = request.json.get('sampling_event_id')
    if sampling_event_id:
        db(db.checklists.sampling_event_id == sampling_event_id).delete()
        db(db.sightings.sampling_event_id == sampling_event_id).delete()
        # You may also delete from the species table if required
        db.commit()
        return "ok"
    else:
        return "Sampling event ID is missing"
    
# edit an entry
# @action('get_checklist', method='POST')
# @action.uses(db, auth.user)
# def get_checklist():
#     sampling_event_id = request.json.get('sampling_event_id')
#     if sampling_event_id:
#         checklist_entry = db(db.checklists.sampling_event_id == sampling_event_id).select().first()
#         if checklist_entry:
#             return dict(
#                 latitude=checklist_entry.latitude,
#                 longitude=checklist_entry.longitude,
#                 observation_date_time=checklist_entry.observation_date_time,
#                 duration_minutes=checklist_entry.duration_minutes,
#                 common_name=checklist_entry.common_name,
#                 sighting_count=checklist_entry.sighting_count
#             )
#         else:
#             return dict(error="Checklist entry not found")
#     else:
#         return dict(error="Sampling event ID is missing")

# @action('update_checklist', method='POST')
# @action.uses(db, auth.user)
# def update_checklist():
#     data = request.json
#     sampling_event_id = data.get('sampling_event_id')
#     latitude = data.get('latitude')
#     longitude = data.get('longitude')
#     observation_date_time = data.get('observation_date_time')
#     duration_minutes = data.get('duration_minutes')
#     common_name = data.get('common_name')
#     sighting_count = data.get('sighting_count')

#     if not sampling_event_id:
#         return dict(error="Sampling event ID is missing")

#     checklist_entry = db(db.checklists.sampling_event_id == sampling_event_id).select().first()
#     if not checklist_entry:
#         return dict(error="Checklist entry not found")

#     checklist_entry.update_record(
#         latitude=latitude,
#         longitude=longitude,
#         observation_date_time=observation_date_time,
#         duration_minutes=duration_minutes,
#         common_name=common_name,
#         sighting_count=sighting_count
#     )
#     db.commit()

#     # Update the corresponding entry in the sightings table
#     sighting_entry = db(db.sightings.sampling_event_id == sampling_event_id).select().first()
#     if sighting_entry:
#         sighting_entry.update_record(
#             common_name=common_name,
#             observation_count=sighting_count
#         )
#         db.commit()

#     return dict(success=True)

# Checklist ___________________________________________________