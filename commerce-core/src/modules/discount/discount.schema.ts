import gql from 'graphql-tag';

export const discountTypeDefs = gql`
  enum DiscountType {
    PERCENTAGE
    FIXED
  }

  type Discount {
    id: ID!
    code: String!
    type: DiscountType!
    value: Float!
    minOrderValue: Float!
    maxDiscountAmount: Float
    usageLimit: Int
    usageCount: Int!
    validFrom: String!
    validUntil: String!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input CreateDiscountInput {
    code: String!
    type: DiscountType!
    value: Float!
    minOrderValue: Float!
    maxDiscountAmount: Float
    usageLimit: Int
    validFrom: String!
    validUntil: String!
  }

  extend type Query {
    discounts(activeOnly: Boolean): [Discount!]!
    discount(id: ID!): Discount
    validateDiscountCode(code: String!, subtotal: Float!): Discount
  }

  extend type Mutation {
    createDiscount(input: CreateDiscountInput!): Discount!
    updateDiscountStatus(id: ID!, isActive: Boolean!): Discount!
    deleteDiscount(id: ID!): Boolean!
  }
`;
