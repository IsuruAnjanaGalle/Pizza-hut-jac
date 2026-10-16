include models;
include walkers_catalog;
include walkers_delivery;
include walkers_chat;

# Server entry walker
walker:pub init {
    can start with Root entry {
        report {
            "status": "ready",
            "message": "Pizza Hut Jac Backend Online"
        };
    }
}
