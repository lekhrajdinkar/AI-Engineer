# Shared Package

Only stable cross-service concerns belong here:

- `contracts/`: types that describe HTTP or event payloads
- `platform/`: identity context, Firebase initialization, middleware, and app setup

Business rules, repositories, database models, provider clients, and service
configuration must remain in the owning service. Services may import
`backend.shared`; they must never import another service's `app` package.
