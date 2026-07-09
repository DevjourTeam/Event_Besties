import { SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN } from '../config/shopifyConfig'

const MOCK_CANVAS_DESIGN = {
  name: 'Bear Board 2FT',
  canvasWidth: 400,
  canvasHeight: 500,
  svgClipPath: null,
  backgroundColor: '#ffffff',
  sizeLabel: '2FT / 60cm',
  category: 'Bears',
  availableSizes: [
    { id: '1', label: '1FT / 30cm', price: '£49.99', width: 200, height: 250 },
    { id: '2', label: '2FT / 60cm', price: '£89.99', width: 400, height: 500 },
    { id: '3', label: '3FT / 90cm', price: '£129.99', width: 600, height: 750 }
  ],
  printProfile: 'High Quality Vinyl',
  description: 'Premium quality vinyl print on durable board material. Perfect for indoor and outdoor use. Weather resistant and fade-proof.'
}

const MOCK_TEMPLATE_DESIGN = {
  name: 'Birthday Arch Template',
  canvasWidth: 500,
  canvasHeight: 600,
  svgClipPath: null,
  templateJSON: null,
  editableFields: ['Name', 'Message', 'Photo'],
  category: 'Birthday',
  availableSizes: [
    { id: '1', label: 'Small', price: '£39.99' },
    { id: '2', label: 'Medium', price: '£59.99' },
    { id: '3', label: 'Large', price: '£89.99' }
  ],
  printProfile: 'Premium Glossy',
  description: 'Beautiful birthday arch design with customizable text and photo areas. Perfect for memorable celebrations.'
}

function fieldsToObject(fields) {
  return fields.reduce((acc, field) => {
    acc[field.key] = field.value
    return acc
  }, {})
}

function storefrontFetch(query, variables) {
  return fetch('https://' + SHOPIFY_STORE_DOMAIN + '/api/2024-01/graphql.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({ query, variables })
  })
    .then(r => r.json())
    .then(r => {
      if (r.errors) throw new Error(r.errors[0].message)
      return r.data
    })
}

const METAOBJECT_QUERY = `
  query GetDesign($id: ID!) {
    metaobject(id: $id) {
      id
      type
      fields { key value }
    }
  }
`

export async function fetchCanvasDesign(id) {
  if (id.startsWith('test-')) {
    return Promise.resolve(MOCK_CANVAS_DESIGN)
  }
  const data = await storefrontFetch(METAOBJECT_QUERY, { id })
  const fields = fieldsToObject(data.metaobject.fields)
  return {
    name: fields.name,
    canvasWidth: parseInt(fields.canvas_width) || 500,
    canvasHeight: parseInt(fields.canvas_height) || 600,
    svgClipPath: fields.svg_clip_path || null,
    backgroundColor: fields.background_color || '#ffffff',
    sizeLabel: fields.size_label || '',
    category: fields.category || '',
    availableSizes: fields.available_sizes ? JSON.parse(fields.available_sizes) : [],
    printProfile: fields.print_profile || '',
    description: fields.description || ''
  }
}

export async function fetchTemplateDesign(id) {
  if (id.startsWith('test-template-')) {
    return Promise.resolve(MOCK_TEMPLATE_DESIGN)
  }
  const data = await storefrontFetch(METAOBJECT_QUERY, { id })
  const fields = fieldsToObject(data.metaobject.fields)
  return {
    name: fields.name,
    canvasWidth: parseInt(fields.canvas_width) || 500,
    canvasHeight: parseInt(fields.canvas_height) || 600,
    svgClipPath: fields.svg_clip_path || null,
    templateJSON: fields.template_json ? JSON.parse(fields.template_json) : null,
    editableFields: fields.editable_fields ? JSON.parse(fields.editable_fields) : [],
    category: fields.category || '',
    availableSizes: fields.available_sizes ? JSON.parse(fields.available_sizes) : [],
    printProfile: fields.print_profile || '',
    description: fields.description || ''
  }
}
