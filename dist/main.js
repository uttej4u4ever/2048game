"use strict";
var Grid = /** @class */ (function () {
    function Grid(size, elem) {
        var _this = this;
        this.data = [];
        this.size = size;
        var totalElements = Math.pow(size, 2);
        repeat(totalElements, function (i) { return _this.data[i] = 0; });
        this.empties = totalElements;
        this.elem = elem;
        this.init();
    }
    Grid.prototype.init = function () {
        this.draw();
    };
    Grid.prototype.setElement = function (idx, val) {
        this.data[idx] = val;
        this.draw();
    };
    Grid.prototype.draw = function () {
        var _this = this;
        var markup = '';
        repeat(this.size, function (i) {
            markup += '<div class="row">';
            repeat(_this.size, function (j) {
                var elem = _this.data[elementIndex(_this.size, [i, j])];
                markup += '<div class="cell">' + (elem == 0 ? '' : Math.pow(2, elem)) + '</div>';
            });
            markup += '</div>';
        });
        markup += '<div id="over"><span id="over-text">Game over!</span></div>';
        this.elem.innerHTML = markup;
    };
    Grid.prototype.popIn = function () {
        if (this.empties > 0) {
            this.setElement(findEmptyCell(this.data), [1, 2][randomInt(2)]);
            this.empties--;
        }
    };
    Grid.prototype.move = function (dir) {
        var _this = this;
        var tr = new Transformed(this, dir);
        var moved = false;
        repeat(this.size, function (i) {
            var limit = _this.size;
            var row = tr[i];
            var slide;
            while (slide = nextSlide(row, limit)) {
                row.doSlide(slide);
                if (slide.type === "Double") {
                    limit = slide.end;
                    _this.empties++;
                }
                moved = true;
            }
        });
        if (moved) {
            this.popIn();
        }
        if (!hasNextMove(this)) {
            var elem = document.getElementById("over");
            if (elem) {
                elem.style.display = "block";
            }
        }
    };
    return Grid;
}());
// Will loop infinitely on full grid!
function findEmptyCell(grid) {
    var idx;
    do {
        idx = randomInt(grid.length);
    } while (grid[idx] !== 0);
    return idx;
}
var Transformed = /** @class */ (function () {
    function Transformed(grid, dir) {
        var _this = this;
        this.grid = grid;
        this.dir = dir;
        return proxyArray(this, function (i) { return new Row(_this, i); });
    }
    return Transformed;
}());
;
var Row = /** @class */ (function () {
    function Row(grid, n) {
        var _this = this;
        this.tgrid = grid;
        this.n = n;
        return proxyArray(this, function (i) { return rowGet(_this, i); }, function (i, val) {
            _this.set(i, val);
            return true;
        });
    }
    Row.prototype.set = function (i, val) {
        this.tgrid.grid.setElement(rowIndex(this, i), val);
    };
    Row.prototype.slideCells = function (start, end) {
        for (var j = end; j > start; j--) {
            this.set(j, rowGet(this, j - 1));
        }
        this.set(start, 0);
    };
    Row.prototype.doSlide = function (slide) {
        var dest = slide.end;
        if (slide.type === 'Double') {
            this.set(dest, rowGet(this, dest) + 1);
            dest--;
        }
        this.slideCells(slide.start, dest);
    };
    return Row;
}());
function proxyArray(obj, getter, setter) {
    var handler = {
        get: function (target, prop, receiver) {
            return withMaybeInt(prop, getter, function (p) { return Reflect.get(target, p, receiver); });
        }
    };
    if (setter !== undefined) {
        handler.set = function (target, prop, val, receiver) {
            return withMaybeInt(prop, function (i) { return setter(i, val); }, function (p) { return Reflect.set(target, p, val, receiver); });
        };
    }
    return new Proxy(obj, handler);
}
function withMaybeInt(prop, indexHandler, elseHandler) {
    if (typeof (prop) === 'number') {
        return indexHandler(prop);
    }
    if (typeof (prop) === 'string') {
        var idx = parseInt(prop);
        if (!isNaN(idx)) {
            return indexHandler(idx);
        }
    }
    return elseHandler(prop);
}
// x is column, y is row. [0,0] is top left.
function elementIndex(size, _a) {
    var x = _a[0], y = _a[1];
    return (y * size) + x;
}
function mapFromRight(size, dir, _a) {
    var row = _a[0], col = _a[1];
    var firstToLast = function (n) {
        return (size - n - 1);
    };
    switch (dir) {
        case 'up':
            return [firstToLast(col), row];
        case 'down':
            return [col, firstToLast(row)];
        case 'left':
            return [row, firstToLast(col)];
        case 'right':
            return [row, col];
    }
}
function transformedIndex(tgrid, idx) {
    return elementIndex(tgrid.grid.size, mapFromRight(tgrid.grid.size, tgrid.dir, idx));
}
function rowIndex(row, i) {
    return transformedIndex(row.tgrid, [row.n, i]);
}
function rowGet(row, i) {
    return row.tgrid.grid.data[rowIndex(row, i)];
}
function rowSize(row) {
    return row.tgrid.grid.size;
}
function nextSlide(row, limit) {
    var skipLeadingBlanks = function () {
        var j = 0;
        while (j < limit && row[j] === 0) {
            j++;
        }
        return j;
    };
    limit--;
    var j = skipLeadingBlanks();
    var start = j;
    function slide(type, end) {
        return {
            type: type,
            start: start,
            end: end
        };
    }
    var lastDouble = 0;
    while (j < limit) {
        j++;
        if (row[j] === 0) {
            return slide('Blank', j);
        }
        if (row[j] === row[j - 1]) {
            lastDouble = j;
        }
    }
    ;
    if (lastDouble > 0) {
        return slide('Double', lastDouble);
    }
    else {
        return undefined;
    }
}
function hasNextMove(grid) {
    var out = false;
    ['up', 'down', 'left', 'right'].forEach(function (dir) {
        var tr = new Transformed(grid, dir);
        repeat(grid.size, function (i) {
            out = out || (nextSlide(tr[i], grid.size) !== undefined);
        });
    });
    return out;
}
// General utilities
function randomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
function repeat(n, f) {
    for (var i = 0; i < n; i++) {
        f(i);
    }
}
//# sourceMappingURL=main.js.map