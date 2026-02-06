import gql from 'graphql-tag';

export const orderTypeDefs = gql`
  enum OrderStatus {
    PENDING
    PAID
    SHIPPED
    COMPLETED
  }

  type OrderItem {
    id: ID!
    productId: ID!
    productName: String!
    sellerId: ID!
    variantId: ID!
    variantSku: String!
    price: Float!
    quantity: Int!
    subtotal: Float!
    hsnCode: String!
    gstRate: Float!
    taxableAmount: Float!
    gstAmount: Float!
    sgstRate: Float!
    cgstRate: Float!
    igstRate: Float!
    sgstAmount: Float!
    cgstAmount: Float!
    igstAmount: Float!
    totalAmount: Float!
  }

  type Order {
    id: ID!
    buyerId: ID!
    status: OrderStatus!
    items: [OrderItem!]!
    subtotal: Float!
    discount: Float!
    total: Float!
    discountCode: String
    taxableSubtotal: Float!
    totalGst: Float!
    totalSgst: Float!
    totalCgst: Float!
    totalIgst: Float!
    grandTotal: Float!
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    myOrders: [Order!]!
    sellerOrders: [Order!]!
    order(id: ID!): Order
  }

  extend type Mutation {
    checkout: Order!
    updateOrderStatus(orderId: ID!, status: OrderStatus!): Order!
  }
`;
