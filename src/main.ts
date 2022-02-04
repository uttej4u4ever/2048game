class Grid {
    data : number[] = [];
    size : number;
    empties : number;

    elem : HTMLElement;

    constructor(size : number, elem : HTMLElement) {
        this.size = size;

        let totalElements = size ** 2;
        
        repeat(totalElements, i => this.data[i] = 0);

        this.empties = totalElements;

        this.elem = elem;

        this.init();
    }

    init() {
        this.draw();
    }

    setElement(idx : number, val : number) {
        this.data[idx] = val;
        this.draw();
    }

    draw() {
        let markup = '';

        repeat(this.size, i => {
            markup += '<div class="row">';
    
            repeat(this.size, j => {
                let elem = this.data[elementIndex(this.size, [i, j])];
    
                markup += '<div class="cell">' + (elem == 0 ? '' : 2 ** elem) + '</div>'
            })
            markup += '</div>';
        })

        markup += '<div id="over"><span id="over-text">Game over!</span></div>'
        this.elem.innerHTML = markup;
    }

    popIn() {
        // Will loop infinitely on full grid!
        function findEmptyCell(grid : number[]) : number {
            let idx : number;

            do {
                idx = randomInt(grid.length);
            } while (grid[idx] !== 0);

            return idx;
        }

        if (this.empties > 0) {
            this.setElement(findEmptyCell(this.data), [1, 2][randomInt(2)]);
            this.empties--;
        }
    }

    move(dir : Direction) {
        let tr : any = new Transformed(this, dir);
        let moved = false;

        repeat(this.size, i => {
            let limit = this.size;
            let row = tr[i];
            let slide;

            while (slide = nextSlide(row, limit)) {
                row.doSlide(slide);
                
                if (slide.type === "Double") {
                    limit = slide.end;
                    this.empties++;
                }

                moved = true;
            }
        })

        if (moved) { this.popIn(); }

        if (!hasNextMove(this)) {
            let elem = document.getElementById("over");
            
            if (elem) {
                elem.style.display = "block";
            }
        }
    }
}

class Transformed {
    grid : Grid;
    dir : Direction;

    constructor(grid : Grid, dir : Direction) {
        this.grid = grid;
        this.dir = dir;

        return proxyArray(this, i => new Row(this, i));
    }
};

type Direction = 'up' | 'down' | 'left' | 'right';

class Row {
    tgrid : Transformed;
    n : number;

    constructor(grid : Transformed, n : number) {
        this.tgrid = grid;
        this.n = n;

        return proxyArray(
            this,
            i => rowGet(this, i),
            (i, val) => {
                this.set(i, val);
                return true;
            }
        )
    }

    set(i : number, val : number) {
        this.tgrid.grid.setElement(rowIndex(this, i), val);
    }

    slideCells(start : number, end : number) {
        for (let j = end; j > start; j--) { this.set(j, rowGet(this, j - 1)); }
        this.set(start, 0);
    }

    doSlide(slide : Slide) {
        let dest = slide.end;

        if (slide.type === 'Double') {
            this.set(dest, rowGet(this, dest) + 1);
            dest--;
        }

        this.slideCells(slide.start, dest);
    }
}

// Adds array-style integer subscripting (obj[0]) to an object, using a supplied
// getter and optional setter functions. TypeScript doesn't handle proxies that
// well right now, so these might need to be cast to `any` to use.
function proxyArray<T extends object, U>(
    obj : T,
    getter : (i : number) => U,
    setter? : (i : number, val : U) => boolean
) : T {
    let handler : ProxyHandler<T> = {
        get(target, prop, receiver) {
            return withMaybeInt(
                prop,
                getter,
                p => Reflect.get(target, p, receiver)
            )
        }
    };

    if (setter !== undefined) {
        handler.set = function(target, prop, val, receiver) {
            return withMaybeInt(
                prop,
                i => setter(i, val),
                p => Reflect.set(target, p, val, receiver)
            )
        }
    }

    return new Proxy(obj, handler);
}

// indexHandler if val is a number or a string parseable to an integer,
// elseHandler otherwise. This function will misbehave around not-integer reals..
function withMaybeInt<T>(
    val : any,
    indexHandler : (i : number) => T,
    elseHandler : (p : any) => T
    ) : T {
    if (typeof(val) === 'number') {
        return indexHandler(val);
    }

    if (typeof(val) === 'string') {
        let i = parseInt(val);
        
        if (!isNaN(i)) {
            return indexHandler(i);
        }
    }

    return elseHandler(val);
}

// x is column, y is row. [0,0] is top left.
function elementIndex(size : number, [x, y] : [number, number]) : number {
    return (y * size) + x;
}

function mapFromRight (size : number, dir : Direction, [row, col] : [number, number])
    : [number, number] {
    let firstToLast = (n: number) : number => {
        return (size - n - 1);
    }

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

function transformedIndex(tgrid : Transformed, idx : [number, number]) {
    return elementIndex(
        tgrid.grid.size,
        mapFromRight(
            tgrid.grid.size,
            tgrid.dir,
            idx
        )
    )
}

function rowIndex(row : Row, i : number) {
    return transformedIndex(row.tgrid, [row.n, i])
}

function rowGet(row : Row, i : number) {
    return row.tgrid.grid.data[rowIndex(row, i)];
}

function rowSize(row : Row) : number {
    return row.tgrid.grid.size;
}

type Slide = {
    type: ('Double' | 'Blank'),
    start: number,
    end: number
}

function nextSlide(row : any, limit : number) : Slide | undefined {
    let skipLeadingBlanks = () => {
        let j = 0;
        while (j < limit && row[j] === 0) { j++; }
        return j;
    }

    limit--;

    let j = skipLeadingBlanks();
    let start = j;

    function slide(type: ('Blank' | 'Double'), end : number) : Slide {
        return {
            type: type,
            start: start,
            end: end
        }
    }

    let lastDouble = 0;

    while(j < limit) {
        j++;

        if (row[j] === 0) { return slide('Blank', j); }
        if (row[j] === row[j - 1]) { lastDouble = j; }
    };

    if (lastDouble > 0) {
        return slide('Double', lastDouble);
    } else {
        return undefined;
    }
}

function hasNextMove(grid : Grid) : boolean {
    let out = false;

    ['up', 'down','left','right'].forEach(dir => {
        let tr : any = new Transformed(grid, <Direction>dir);

        repeat(grid.size, i => {
            out = out || (nextSlide(tr[i], grid.size) !== undefined)
        })
    })

    return out;
}

// General utilities
function randomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
}

function repeat(n: number, f: (i: number) => void) {
    for (let i = 0; i < n; i++) {
        f(i);
    }
}