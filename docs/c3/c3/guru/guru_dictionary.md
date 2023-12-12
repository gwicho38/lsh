# GURU | DEFINITIONS

## Space Mission Planning Terminology

> Ephemeris: A set of time-stamped data that describes the position, velocity, and other orbital parameters of a satellite at specific points in time. It's used for tracking and predicting the satellite's movement.

---

> Collection Plan: A detailed strategy outlining the schedule, locations, and methods for acquiring data from a satellite's sensors or instruments. It ensures efficient and effective use of satellite resources.

---

> Tip and Cue: In satellite imaging, "tip" refers to the process of adjusting a satellite's orientation to a specific target area, while "cue" refers to initiating data collection based on an external event, such as a sensor detecting a specific signal or change.

---

> Geostationary Orbit: An orbit in which a satellite orbits the Earth at the same rate as the Earth's rotation, allowing it to appear stationary relative to a fixed point on the surface.

---

> Polar Orbit: An orbit that passes over the Earth's poles, providing global coverage as the Earth rotates beneath the satellite.

---

> Attitude Control: The process of adjusting a satellite's orientation or attitude in space to maintain its desired position, stability, and operational efficiency.

---

> Swath Width: The width of the ground area covered by a satellite's sensor or camera in a single pass. It determines the coverage area and resolution of the collected data.

---

> Resolution: The level of detail or clarity in an image captured by a satellite's sensor. It's often measured in terms of spatial resolution, which is the smallest distinguishable feature on the ground.

---

> Tasking: The assignment of specific objectives or targets to a satellite for surveillance or data collection. Tasking involves determining what data needs to be gathered and how the satellite's resources will be allocated.

## Ephemeris Data Terminology


> Cartesian Coordinates --> (x, y, z)

---

> Span Begin and Span End: These are the start and end times of the ephemeris data's validity.."

---

> Epoch UTC: This is a specific timestamp that acts as the reference point for the trajectory data.

---

> Delta Time: The time interval between data points in the ephemeris data. 

---

> Frame: The reference frame in which the position and velocity data is defined: 

  >> "ECEF" (Earth-Centered-Earth-Fixed). This frame has its origin at the center of the Earth and its axes aligned with the Earth's rotational axis.

---

> Points: This section contains an array of data points representing the object's position, velocity, and acceleration at different time intervals (defined by "time") from the epoch UTC.

  >> Each data point contains:

    - Time: The elapsed time from the epoch UTC in seconds.

    - Position: The position of the object in the ECEF frame, defined by its Cartesian coordinates (x, y, z).

    - Velocity: The velocity of the object in the ECEF frame, also defined by Cartesian coordinates (x, y, z).

    - Acceleration: The acceleration of the object in the ECEF frame, again defined by Cartesian coordinates (x, y, z).


## Catalog Data Terminology

> .dbf (dBASE File): 

The .dbf file is a database file that stores attribute data associated with geographic features in the GIS dataset. 

  >> key concept is "attribute" data.

  >> structure:

    It typically contains tabular data in a structured format, 

    each row represents an individual geographic feature and 

    each column represents an attribute of that feature. 

> This file contains non-spatial information, such as names, IDs, descriptions, or other attributes relevant to the features represented by the shapefile.

---

> .prj (Projection File): 

The .prj file stores information about the coordinate system and projection used for the geographic data in the dataset. It defines how geographic features are mapped onto a flat surface (such as a map or computer screen). The projection information is crucial for accurately representing geographic features in their correct locations on a map.

---

> .shp (Shapefile): 

The .shp file is the core file of a shapefile dataset. It contains the geometric data that defines the shapes of geographic features, such as points, lines, or polygons. 

Each shape in the .shp file is associated with corresponding attribute data stored in the .dbf file. The .shp file defines the spatial relationships and positions of the features, while the attribute data in the .dbf file provides additional information about these features.

---

> .shx (Shapefile Index): 

The .shx file is an index file that provides a quick lookup for accessing the geometric data stored in the .shp file. 

It contains a list of offsets that allow the GIS software to efficiently retrieve the shape data associated with specific features. 

The .shx file enhances the performance of spatial queries and data retrieval by reducing the need to read the entire .shp file.

