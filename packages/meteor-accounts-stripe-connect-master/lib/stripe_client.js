Stripe = {};
Stripe.requestCredential = function (options, credentialRequestCompleteCallback) {

    if (!credentialRequestCompleteCallback && typeof options === "function") {
        credentialRequestCompleteCallback = options;
        options = {};
    }

    var config = ServiceConfiguration.configurations.findOne({ service: "stripe" });
    if (!config) {
        credentialRequestCompleteCallback && credentialRequestCompleteCallback(new ServiceConfiguration.ConfigError("Service not configured"));
        return;
    }

    var credentialToken = Random.id();
    var loginStyle = OAuth._loginStyle('stripe', config, options);
    var mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
    var display = mobile ? "touch" : "popup";
    var scope = "";

    if (options && options.requestPermissions) {
        scope = options.requestPermissions.join(",");
    }

    if (options && options.newAccountDetails) {
        prefill = '&' + $.param(options.newAccountDetails);
    } else {
        prefill = '';
    }

    var loginUrl =
        'https://connect.stripe.com/oauth/authorize' +
            '?response_type=code' +
            '&client_id=' + config.appId +
            '&scope=' + config.scope +
            '&redirect_uri=' + Meteor.absoluteUrl('_oauth/stripe?close') +
            '&state=' + OAuth._stateParam(loginStyle, credentialToken) +
            '&stripe_landing=' + options.stripe_landing +
            prefill;

    var dimensions = { width: 650, height: 560 };
    Oauth.initiateLogin(credentialToken, loginUrl, credentialRequestCompleteCallback, dimensions);

};
