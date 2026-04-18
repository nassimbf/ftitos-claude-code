---
name: hexagonal-architecture
description: Design, implement, and refactor Ports & Adapters systems with clear domain boundaries, dependency inversion, and testable use-case orchestration.
origin: ECC
---

# Hexagonal Architecture

Hexagonal architecture (Ports and Adapters) keeps business logic independent from frameworks, transport, and persistence details. The core app depends on abstract ports, and adapters implement those ports at the edges.

## When to Use

- Building new features where long-term maintainability and testability matter
- Refactoring layered or framework-heavy code where domain logic is mixed with I/O concerns
- Supporting multiple interfaces for the same use case (HTTP, CLI, queue workers)
- Replacing infrastructure without rewriting business rules

## Core Concepts

- **Domain model**: Business rules and entities/value objects. No framework imports.
- **Use cases (application layer)**: Orchestrate domain behavior and workflow steps.
- **Inbound ports**: Contracts describing what the application can do.
- **Outbound ports**: Contracts for dependencies the application needs (repositories, gateways).
- **Adapters**: Infrastructure implementations of ports (HTTP controllers, DB repositories).
- **Composition root**: Single wiring location where concrete adapters are bound to use cases.

Dependency direction is always inward: Adapters -> Application -> Domain.

## Module Layout

```text
src/
  features/
    orders/
      domain/
        Order.ts
      application/
        ports/
          inbound/CreateOrder.ts
          outbound/OrderRepositoryPort.ts
        use-cases/CreateOrderUseCase.ts
      adapters/
        inbound/http/createOrderRoute.ts
        outbound/postgres/PostgresOrderRepository.ts
      composition/ordersContainer.ts
```

## TypeScript Example

### Port definitions

```typescript
export interface OrderRepositoryPort {
  save(order: Order): Promise<void>;
  findById(orderId: string): Promise<Order | null>;
}

export interface PaymentGatewayPort {
  authorize(input: { orderId: string; amountCents: number }): Promise<{ authorizationId: string }>;
}
```

### Use case

```typescript
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepositoryPort,
    private readonly paymentGateway: PaymentGatewayPort
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const order = Order.create({ id: input.orderId, amountCents: input.amountCents });
    const auth = await this.paymentGateway.authorize({
      orderId: order.id, amountCents: order.amountCents,
    });
    const authorizedOrder = order.markAuthorized(auth.authorizationId);
    await this.orderRepository.save(authorizedOrder);
    return { orderId: order.id, authorizationId: auth.authorizationId };
  }
}
```

### Composition root

```typescript
export const buildCreateOrderUseCase = (deps: { db: SqlClient; stripe: StripeClient }) => {
  const orderRepository = new PostgresOrderRepository(deps.db);
  const paymentGateway = new StripePaymentGateway(deps.stripe);
  return new CreateOrderUseCase(orderRepository, paymentGateway);
};
```

## Testing Guidance

- **Domain tests**: Pure business rules (no mocks, no framework setup)
- **Use-case unit tests**: Fakes/stubs for outbound ports
- **Adapter integration tests**: Run against real infrastructure
- **E2E tests**: Cover critical user journeys through full stack

## Anti-Patterns to Avoid

- Domain entities importing ORM models or SDK clients
- Use cases reading directly from `req`, `res`, or queue metadata
- Returning database rows directly from use cases
- Adapters calling each other directly instead of flowing through ports
- Spreading dependency wiring across many files

## Migration Playbook

1. Pick one vertical slice with frequent change pain
2. Extract a use-case boundary with explicit input/output types
3. Introduce outbound ports around existing infrastructure calls
4. Move orchestration logic into the use case
5. Add tests around the new boundary
6. Repeat slice-by-slice; avoid full rewrites
