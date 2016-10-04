module.exports = bookshelf.Model.extend({
  tableName: 'posts_users',

  post: function () {
    return this.belongsTo(Post)
  },

  user: function () {
    return this.belongsTo(User).query({where: {active: true}})
  },

  setToNow: function (trx) {
    return this.save({
      last_read_at: new Date()
    }, { patch: true, transacting: trx })
  }
}, {
  findOrCreate: function (userId, postId, opts = {}) {
    return this.query({where: {user_id: userId, post_id: postId}})
      .fetch()
      .then(lastRead => {
        if (lastRead) return Promise.resolve(lastRead)
        return new this({
          post_id: postId,
          last_read_at: new Date(),
          user_id: userId
        }).save(null, { transacting: opts.trx })
      })
  }
})
