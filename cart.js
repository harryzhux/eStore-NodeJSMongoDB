/*
  Shopping cart
*/


var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');


function CartDAO(database) {
    "use strict";

    this.db = database;

    this.getCart = function(userId, callback) {
        "use strict";

        /*
         *
         * Query the "cart" collection by userId and pass the cart to the
         * callback function.
         *
         */

        console.log('getCart userId: ' + userId);
        var query = (userId == '') ? {_id: ''} : {userId: userId};
        var coll = this.db.collection('cart');
        coll.findOne(query, {_id: 0, userId: 1, items: 1}, function(err, doc) {
            assert.equal(null, err);
            if (!doc) doc = {};
            //console.log(doc);
            if (!doc.items) doc.items = [];
            for (var i=0, len=doc.items.length; i<len; ++i) {
                 var item = doc.items[i]
                 if (!item.quantity) item.quantity = 1;
            }
            callback(doc);
        });

    }

    this.itemInCart = function(userId, itemId, callback) {
        "use strict";

        /*
         *
         * Determine whether or not the cart associated with the userId contains
         * an item identified by itemId. If the cart does contain the item, pass
         * the item to the callback. If it does not, pass the value null to the
         * callback.
         *
         */
        console.log('itemInCart userId: ' + userId + ', itemId: ' + itemId);
        var query = (userId == '') ? {_id: ''} : {userId: userId};
        var coll = this.db.collection('cart');
        coll.findOne(query, {_id: 0, items: 1}, function(err, doc) {
            assert.equal(null, err);
            var matchItem = {}
            if (!doc) doc = {};
            //console.log(doc);
            if (!doc.items) doc.items = [];
            for (var i=0, len=doc.items.length; i<len; ++i) {
                 var item = doc.items[i]
                 if (item._id == itemId) matchItem = item;
            }
            console.log('itemInCart matchItem: ' + matchItem.title);
            callback(matchItem);
        });

    }

    this.addItem = function(userId, item, callback) {
        "use strict";

        /*
         *
         * Update or insert an item in the user's cart in the database.
         * Pass the result to the callback.
         *
         */
        this.db.collection("cart").findOneAndUpdate(
            {userId: userId},
            {"$push": {items: item}},
            {
                upsert: true,
                returnOriginal: false
            },
            function(err, result) {
                assert.equal(null, err);
                callback(result.value);
            });

    };

    this.updateQuantity = function(userId, itemId, quantity, callback) {
        "use strict";

        /*
         *
         * Update the quantity of an item in the user's cart in the database
         * by setting quantity to the value passed in the quantity parameter.
         * If the value passed for quantity is 0, remove the item from the
         * user's cart stored in the database. Pass the updated user's cart to
         * the callback.
         *
         */
        console.log('updateQuantity userId: ' + userId + ', itemId: ' + itemId);
        var coll = this.db.collection('cart');
        coll.findOne({userId: userId}, {}, function(err, doc) {
            assert.equal(null, err);
            //console.log(doc);
            console.log('updateQuantity quantity: ' + quantity);
            var newCart = [];
            for (var i=0, len=doc.items.length; i<len; ++i) {
                 var item = doc.items[i]
                 if (item._id == itemId) {
                    if (quantity > 0) {
                        item.quantity = quantity;
                        newCart.push(item);
                    }
                    // else quantity==0, do not put item to newCart
                 } else {
                    newCart.push(item);
                 }
            }
            doc.items = newCart; // replace items with newCart
            coll.save(doc, {}, function(err, result) {
                assert.equal(null, err);
                assert.equal(1, result.result.n);
            });
            callback(doc);
        });

    }

}

module.exports.CartDAO = CartDAO;
