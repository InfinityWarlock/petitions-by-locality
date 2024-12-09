CREATE TABLE constituency (
    id int PRIMARY KEY,
    name varchar
);

CREATE TABLE petition (
    id int PRIMARY KEY,
    name varchar,
    action varchar,
    details varchar
);

CREATE TABLE signature_count (
    id int PRIMARY key,
    petition_id int REFERENCES petition (id),
    constituency_id int REFERENCES constituency (id),
    count int
);