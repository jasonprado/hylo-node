'use strict'

exports.seed = function (knex, Promise) {
  return knex('communities_posts').del()
    .then(() => knex('users_community').del())
    .then(() => knex('communities').del())   // Deletes ALL existing entries
    .then(() => knex('communities')
                    .insert({id: 1, name: 'starter-posts', slug: 'starter-posts'})
  )
}
