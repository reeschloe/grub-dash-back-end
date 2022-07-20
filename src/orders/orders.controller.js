const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass

function list(req, res) {
    res.json({data: orders});
}

function bodyDataHas(propertyName) {
    return function (req, res, next) {
      const { data = {} } = req.body;
      if (data[propertyName]) {
        return next();
      }
      next({ status: 400, message: `Order must include a ${propertyName}` });
    };
}

function dishesIsValid(req, res, next) {
    const { data: {dishes} = {} } = req.body;
    if (!Array.isArray(dishes) || !dishes.length) {
        next({
            status: 400,
            message: `Order must include at least one dish`
        })
    } else {
        const index = dishes.findIndex(dish => dish.quantity <= 0 || !Number.isInteger(dish.quantity))
        if (index >= 0) {
            next({
                status: 400,
                message: `Dish ${index} must have a quantity that is an integer greater than 0`
            })
        } else {
            next()
        }
    }
}

let id = nextId()

function create(req, res) {
    const { data: {deliverTo, mobileNumber, dishes, status} = {}} = req.body;
    const newOrder = {
        id,
        deliverTo,
        mobileNumber,
        dishes,
        status,
    };
    orders.push(newOrder);
    res.status(201).json({data: newOrder});
}

function orderExists(req, res, next) {
    const { orderId } = req.params;
     
    const foundOrder = orders.find(order => order.id === orderId);
    if (foundOrder) {
        const { data: {id} = {} } = req.body;
        if (id) {
            if (id !== orderId) {
                next({
                    status: 400,
                    message: `Order id does not match route id. Order: ${id}, Route: ${orderId}.`
                })
            }
        }
        res.locals.order = foundOrder;
        next()
    } else {
        next({
            status: 404,
            message: `Order id does not exist: ${orderId}.`
        })
    }
} 

function read(req, res) {
    const order = res.locals.order;
    res.json({data: order})
}

function statusValidForUpdate(req, res, next) {
    const { data: {status} = {} } = req.body
    if (!status) {
        next({
            status: 400,
            message: `Order must have a status of pending, preparing, out-for-delivery, delivered`
        })
    } else if (status === "delivered") {
        next({
            status: 400,
            message: `A delivered order cannot be changed`
        })
    } else if (!(status === "pending" || status === "preparing" || status === "out-for-delivery")) {
        next({
            status: 400,
            message: `Order must have a status of pending, preparing, out-for-delivery, delivered`
        })
    }
    else {
        next()
    }
}

function update(req, res) {
    const order = res.locals.order;
    const { data: { deliverTo, mobileNumber, dishes, status} = {}} = req.body;
    order.deliverTo = deliverTo;
    order.mobileNumber = mobileNumber;
    order.dishes = dishes;
    order.status = status;

    res.json({data: order})
}

function statusValidForDelete(req, res, next) {
    const order = res.locals.order;
    if (order.status !== "pending") {
        next({
            status: 400,
            message: `An order cannot be deleted unless it is pending`
        })
    } else {
        next()
    }
}

function destroy(req, res) {
    const { orderId } = req.params;
    const index = orders.findIndex(order => order.id === orderId);
    const deletedOrder = orders.splice(index, 1);
    res.sendStatus(204);
}

module.exports = {
    list,
    create: [
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        bodyDataHas("dishes"),
        dishesIsValid,
        create
    ],
    read: [
        orderExists,
        read
    ],
    update: [
        orderExists,
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        bodyDataHas("dishes"),
        statusValidForUpdate,
        dishesIsValid,
        update
    ],
    delete: [
        orderExists,
        statusValidForDelete,
        destroy
    ]
}