BEGIN;
-- Primary keys
ALTER TABLE admin ADD CONSTRAINT admin_pkey PRIMARY KEY (admin_id);
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);
ALTER TABLE farms ADD CONSTRAINT farms_pkey PRIMARY KEY (farm_id);
ALTER TABLE diseases ADD CONSTRAINT diseases_pkey PRIMARY KEY (disease_id);
ALTER TABLE disease_scans ADD CONSTRAINT disease_scans_pkey PRIMARY KEY (scan_id);
ALTER TABLE soil_reports ADD CONSTRAINT soil_reports_pkey PRIMARY KEY (soil_report_id);
ALTER TABLE soil_questionnaires ADD CONSTRAINT soil_questionnaires_pkey PRIMARY KEY (questionnaire_id);
ALTER TABLE soil_analyses ADD CONSTRAINT soil_analyses_pkey PRIMARY KEY (analysis_id);
ALTER TABLE weather_records ADD CONSTRAINT weather_records_pkey PRIMARY KEY (weather_id);

-- Uniqueness
ALTER TABLE admin ADD CONSTRAINT admin_email_unique UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
ALTER TABLE diseases ADD CONSTRAINT diseases_name_unique UNIQUE (disease_name);
ALTER TABLE farms ADD CONSTRAINT farms_user_id_unique UNIQUE (user_id); -- v1 one farm rule

-- Foreign keys
ALTER TABLE farms ADD CONSTRAINT farms_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id);
ALTER TABLE disease_scans ADD CONSTRAINT scans_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id);
ALTER TABLE disease_scans ADD CONSTRAINT scans_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(farm_id);
ALTER TABLE disease_scans ADD CONSTRAINT scans_disease_fk FOREIGN KEY (disease_id) REFERENCES diseases(disease_id);
ALTER TABLE soil_reports ADD CONSTRAINT reports_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id);
ALTER TABLE soil_reports ADD CONSTRAINT reports_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(farm_id);
ALTER TABLE soil_questionnaires ADD CONSTRAINT quest_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id);
ALTER TABLE soil_questionnaires ADD CONSTRAINT quest_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(farm_id);
ALTER TABLE soil_analyses ADD CONSTRAINT analyses_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id);
ALTER TABLE soil_analyses ADD CONSTRAINT analyses_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(farm_id);
ALTER TABLE soil_analyses ADD CONSTRAINT analyses_report_fk FOREIGN KEY (soil_report_id) REFERENCES soil_reports(soil_report_id);
ALTER TABLE soil_analyses ADD CONSTRAINT analyses_quest_fk FOREIGN KEY (questionnaire_id) REFERENCES soil_questionnaires(questionnaire_id);
ALTER TABLE weather_records ADD CONSTRAINT weather_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(farm_id);

-- Cloudinary support columns
ALTER TABLE disease_scans ADD COLUMN image_public_id text;
ALTER TABLE soil_reports ADD COLUMN report_file_public_id text;

-- Admin panel support
ALTER TABLE users ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Indexes for the FK columns every query will filter on
CREATE INDEX idx_disease_scans_user ON disease_scans(user_id);
CREATE INDEX idx_disease_scans_farm ON disease_scans(farm_id);
CREATE INDEX idx_soil_reports_user ON soil_reports(user_id);
CREATE INDEX idx_soil_questionnaires_user ON soil_questionnaires(user_id);
CREATE INDEX idx_soil_analyses_user ON soil_analyses(user_id);
CREATE INDEX idx_weather_records_farm ON weather_records(farm_id);
COMMIT;
