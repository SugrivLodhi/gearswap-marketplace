import gql from 'graphql-tag';

export const typeDefs = gql`
  # Enums
  enum UserRole {
    BUYER
    SELLER
  }

  enum OrderStatus {
    PENDING
    PAID
    SHIPPED
    COMPLETED
  }

  enum DiscountType {
    PERCENTAGE
    FLAT
  }

  # Types
  type User {
    id: ID!
    email: String!
    role: UserRole!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Variant {
    id: ID!
    sku: String!
    price: Float!
    stock: Int!
    attributes: [AttributePair!]!
  }

  type AttributePair {
    key: String!
    value: String!
  }

  type Product {
    id: ID!
    name: String!
    description: String!
    category: String!
    imageUrl: String!
    seller: User!
    variants: [Variant!]!
    createdAt: String!
    updatedAt: String!
  }

  type ProductEdge {
    node: Product!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type ProductConnection {
    edges: [ProductEdge!]!
    pageInfo: PageInfo!
  }

  type CartItem {
    productId: ID!
    variantId: ID!
    productName: String!
    variantSku: String!
    price: Float!
    quantity: Int!
    subtotal: Float!
  }

  type CartWithPricing {
    items: [CartItem!]!
    subtotal: Float!
    discount: Float!
    total: Float!
  }

  type OrderItem {
    productId: ID!
    productName: String!
    sellerId: ID!
    variantId: ID!
    variantSku: String!
    price: Float!
    quantity: Int!
    subtotal: Float!
  }

  type Order {
    id: ID!
    buyerId: ID!
    items: [OrderItem!]!
    status: OrderStatus!
    subtotal: Float!
    discount: Float!
    total: Float!
    discountCode: String
    createdAt: String!
    updatedAt: String!
  }

  type Discount {
    id: ID!
    code: String!
    type: DiscountType!
    value: Float!
    sellerId: ID!
    expiryDate: String
    minimumCartValue: Float
    targetProductIds: [ID!]
    maxUses: Int
    currentUses: Int!
    isActive: Boolean!
    createdAt: String!
  }

  type DiscountValidation {
    valid: Boolean!
    discount: Discount
    discountAmount: Float
    error: String
  }

  type SellerStats {
    totalOrders: Int!
    totalRevenue: Float!
    pendingOrders: Int!
  }

  # Inputs
  input RegisterInput {
    email: String!
    password: String!
    role: UserRole!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input VariantInput {
    sku: String!
    price: Float!
    stock: Int!
    attributes: [AttributeInput!]!
  }

  input AttributeInput {
    key: String!
    value: String!
  }

  input CreateProductInput {
    name: String!
    description: String!
    category: String!
    imageUrl: String!
    variants: [VariantInput!]!
  }

  input UpdateProductInput {
    name: String
    description: String
    category: String
    imageUrl: String
    variants: [VariantInput!]
  }

  input ProductFilters {
    search: String
    category: String
    minPrice: Float
    maxPrice: Float
    sellerId: ID
  }

  input PaginationInput {
    limit: Int
    cursor: String
  }

  input AddToCartInput {
    productId: ID!
    variantId: ID!
    quantity: Int!
  }

  input UpdateCartItemInput {
    productId: ID!
    variantId: ID!
    quantity: Int!
  }

  input CreateDiscountInput {
    code: String!
    type: DiscountType!
    value: Float!
    expiryDate: String
    minimumCartValue: Float
    targetProductIds: [ID!]
    maxUses: Int
  }

  input UpdateDiscountInput {
    code: String
    type: DiscountType
    value: Float
    expiryDate: String
    minimumCartValue: Float
    targetProductIds: [ID!]
    maxUses: Int
    isActive: Boolean
  }

  # Queries
  type Query {
    # Products (Public)
    product(id: ID!): Product!
    products(filters: ProductFilters, pagination: PaginationInput): ProductConnection!

    # Cart (Buyer only)
    myCart: CartWithPricing!

    # Orders (Buyer)
    myOrders: [Order!]!

    # Orders (Seller)
    sellerOrders: [Order!]!
    sellerStats: SellerStats!

    # Order (Authenticated)
    order(id: ID!): Order!

    # Discounts (Seller)
    myDiscounts: [Discount!]!
    discount(id: ID!): Discount

    # Discount validation (Public)
    validateDiscount(code: String!, cartValue: Float!): DiscountValidation!
  }

  # Mutations
  type Mutation {
    # Auth
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    # Products (Seller only)
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Boolean!

    # Cart (Buyer only)
    addToCart(input: AddToCartInput!): CartWithPricing!
    updateCartItem(input: UpdateCartItemInput!): CartWithPricing!
    removeFromCart(productId: ID!, variantId: ID!): CartWithPricing!
    applyDiscount(code: String!): CartWithPricing!
    removeDiscount: CartWithPricing!

    # Orders (Buyer)
    checkout: Order!

    # Orders (Seller)
    updateOrderStatus(orderId: ID!, status: OrderStatus!): Order!

    # Discounts (Seller)
    createDiscount(input: CreateDiscountInput!): Discount!
    updateDiscount(id: ID!, input: UpdateDiscountInput!): Discount!
    deleteDiscount(id: ID!): Boolean!
  }
`;
