include:jac models;
include:jac walkers_catalog;
include:jac walkers_delivery;
include:jac walkers_chat;

# Server entry walker
walker:pub init {
    can start with Root entry {
        report {
            "status": "ready",
            "message": "Pizza Hut Jac Backend Online"
        };
    }
}
