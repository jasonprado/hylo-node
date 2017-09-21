var setup = require(require('root-path')('test/setup'))
var nock = require('nock')

describe('PushNotification', function () {
  var device, pushNotification, tmpEnvVar

  before(() => {
    tmpEnvVar = process.env.DISABLE_PUSH_NOTIFICATIONS
    process.env.DISABLE_PUSH_NOTIFICATIONS = true

    device = new Device({
      token: 'foo'
    })

    pushNotification = new PushNotification({
      alert: 'hi',
      path: '/p',
      badge_no: 7,
      platform: 'ios_macos'
    })

    return setup.clearDb()
    .then(() => device.save())
    .then(() => pushNotification.set('device_id', device.id))
    .then(() => pushNotification.save())
  })

  after(() => {
    process.env.DISABLE_PUSH_NOTIFICATIONS = tmpEnvVar
  })

  describe('.send', () => {
    beforeEach(() => {
      nock(OneSignal.host).post('/api/v1/notifications')
      .reply(200, {result: 'success'})
    })

    it('sets sent_at and disabled', function () {
      return pushNotification.send()
      .then(result => {
        return pushNotification.fetch()
        .then(pn => {
          expect(pn.get('sent_at')).to.not.equal(null)
          expect(pn.get('disabled')).to.be.true
        })
      })
    })
  })
})
