exports.up = function (knex, Promise) {
  return knex.schema.table('communities_tags', table => {
    table.integer('followers').defaultTo(0)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities_tags', table => {
    table.dropColumn('followers')
  })
}
