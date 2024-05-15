-- add new distributor/satellite(s) to testing project
-- DISTRIBUTOR_ID: 0xcD7dE973264D5967D930Ef5144C59E9811ce5787
-- SATELLITE_ADDRESS: 0x1ecBfa0C415183EF22c5125cF281C7DCC8c5fFe5
-- SATELLITE_NETWORK_ID: 5
-- EVENT_ID: 45

-- add satellite contract record
insert into contract (id, network_id, created_at, updated_at, address, project_id)
values (lower('SATELLITE_ADDRESS-SATELLITE_NETWORK_ID'), SATELLITE_NETWORK_ID, now(), now(), lower('SATELLITE_ADDRESS'), 19)

-- add satellite contract interface record
insert into contract_interface
values (nextval('contract_interface_id_seq'::regclass), lower('SATELLITE_ADDRESS-SATELLITE_NETWORK_ID'), '0xe01333e6', now(), now())

-- add distributor contracts
insert into distributor_contract values (nextval('distributor_contract_id_seq'::regclass), lower('DISTRIBUTOR_ID'), lower('SATELLITE_ADDRESS-SATELLITE_NETWORK_ID'), now(), now())
insert into distributor_contract values (nextval('distributor_contract_id_seq'::regclass), lower('DISTRIBUTOR_ID'), lower('0x0466310b91743da33a0aca64bdab0e7f5559e36c-80001'), now(), now())
insert into distributor_contract values (nextval('distributor_contract_id_seq'::regclass), lower('DISTRIBUTOR_ID'), lower('0xc15bac780f7702e83d421955132d192c8841b13f-5'), now(), now())
insert into distributor_contract values (nextval('distributor_contract_id_seq'::regclass), lower('DISTRIBUTOR_ID'), lower('0x2b6488d408d1999c71936ee642f0fad136f8582d-420'), now(), now())
insert into distributor_contract values (nextval('distributor_contract_id_seq'::regclass), lower('DISTRIBUTOR_ID'), lower('0x8073a764c4651a9be132032d7b5e3b319311904e-421613'), now(), now())
insert into distributor_contract values (nextval('distributor_contract_id_seq'::regclass), lower('DISTRIBUTOR_ID'), lower('0x2334937846ab2a3fce747b32587e1a1a2f6eec5a-80001'), now(), now())
insert into distributor_contract values (nextval('distributor_contract_id_seq'::regclass), lower('DISTRIBUTOR_ID'), lower('0xfca08024a6d4bcc87275b1e4a1e22b71fad7f649-5'), now(), now())
insert into distributor_contract values (nextval('distributor_contract_id_seq'::regclass), lower('DISTRIBUTOR_ID'), lower('0x5ea1bb242326044699c3d81341c5f535d5af1504-420'), now(), now())
insert into distributor_contract values (nextval('distributor_contract_id_seq'::regclass), lower('DISTRIBUTOR_ID'), lower('0x2075c9e31f973bb53cae5bac36a8eeb4b082adc2-421613'), now(), now())


-- add event id to distributor
update distributor set event_id = null where event_id = EVENT_ID
update distributor set event_id = EVENT_ID where id = lower('DISTRIBUTOR_ID')