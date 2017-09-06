"use strict";

//***********************//
// Объявление переменных //
//***********************//


// Определяем настройки
var settings = defaultSettings;

// Находим DOM-элемент поля боя
var battleArea = document.getElementById("battleArea");
var enemiesContainer = document.getElementById("enemies");

// Объект-помощник создания HTML элементов
var DomHelper = {
    elements: {}
};


/////////////////////////////////
/////////////////////////////////
/////////////////////////////////
/////////////////////////////////



// Конструктор объектов Unit - игрок и враги.
function Unit(type, xPos = 10, yPos = 10) {

    Unit.count++; // Счётчик созданных юнитов
    Unit.aliveEnemies; // Cчётчик живых врагов
    Unit.enemies; // Массив врагов
    Unit.player; // Объект игрока
    Unit.types; // Набор типов объектов
    Unit.active; // Активный элемент
    Unit.activeId; // ID активного элемента

    this.isPlayer = type.isPlayer;
    this.typeName = type.typeName;
    this.hp = 100;
    this.attcackPower = type.attcackPower;
    this.defensePower = type.defensePower;
    this.additionalDefense = 0;
    this.criticalAttackChance = 0.2;
    this.criticalAttackBoost = 20;
    this.state = "idle";

    this.x = xPos;
    this.y = yPos;

    this.htmlReference = DomHelper.elements.createUnit(this.typeName, this.isPlayer);
    this.addListeners();
}



///////////////////////
// Прототипные методы ///
///////////////////////

// Attack method

Unit.prototype.attack = function(enemy) {
    // Check for death 
    if (enemy.state === "dead") {
        console.log(enemy.typeName + " is dead");
        return false;
    }

    if (this === enemy && !settings.canSuicide) {
        this.showMessage("No suicide please", "say", 2);
        return false;
    }
    var additionalPower = 0;

    // Check critical attack chanse
    if (Math.random() < this.criticalAttackChance) {
        additionalPower += this.attcackPower * this.criticalAttackBoost / 100;
        console.log('additionalPower', 'additionalPower:', additionalPower)
        this.showMessage("Critical!", "critical", settings.gameSpeed);
    }

    // Calculate fight values (attack and defense)
    var defenseValue = enemy.defensePower + enemy.additionalDefense;
    if (defenseValue > 100) { defenseValue = 100; }

    var attackValue = this.attcackPower + additionalPower;

    var hitValue = attackValue * (1 - defenseValue / 100);

    // Attack enemy
    this.startAnimation("attack");
    enemy.startAnimation("blink");
    enemy.hp -= +hitValue.toFixed(2);
    enemy.hp = enemy.hp.toFixed(1);
    enemy.showMessage("-" + hitValue.toFixed(2) + " HP", "hit", settings.gameSpeed);

    console.log('enemy.hp:', enemy.hp);

    // Kill enemy if HP < 0
    if (enemy.hp <= 0) {
        enemy.setState("dead");
        console.log(enemy.typeName + " killed by " + this.typeName);
        enemy.updateHP();
        return "died";
    }

    // Обновление отображения жизней
    enemy.updateHP();
    return true;
}


// Метод защиты юнита

Unit.prototype.shield = function() {
    this.additionalDefense = +(1.25 * this.defensePower).toFixed(1);
    console.log('this.additional...nse', this.additionalDefense);
}


// Обновление информации о жизнях персонажей

Unit.prototype.updateHP = function() {
    // Находим элемент полоски жизней
    var hpBar = this.htmlReference.querySelector(".hpBar");
    var HP = this.hp;

    // Обновляем информацию
    hpBar.innerHTML = "HP: " + HP;
    hpBar.style.backgroundPosition = "-" + HP + "%";
}


Unit.prototype.showMessage = function(message, status, speed = 1) {
    var element = this.htmlReference;
    element.dataset.message = message;
    element.dataset.messageStatus = status;
    this.startAnimation("showMessage", speed);
}


// Метод обновления (присвоения) состояния объекта

Unit.prototype.setState = function(state) {
    this.state = state;
    this.htmlReference.setAttribute("state", state);
    return this;
}


// Метод переключения юнита в статус активного

Unit.prototype.setActive = function(id = 0) {
    if (Unit.active) {
        Unit.active.htmlReference.classList.toggle('active');
    }
    if (this.state !== "dead") {
        Unit.active = this;
        Unit.activeId = id;
        this.htmlReference.classList.toggle('active');
    }
}


// Метод запуска действий юнита 

Unit.prototype.runAction = function(target, action = "attack") {
    var state;
    switch (action) {
        case "attack":
            state = this.attack(target);
            break;
        case "shield":
            this.shield();
            break;
    }
    if (state === "died") { Unit.aliveEnemies--; }
    if (state) {
        Unit.activateNextUnit();
    }
    return state;
}


// Метод добавления обработчиков событий

Unit.prototype.addListeners = function() {
    // Обработчик клика
    this.htmlReference.addEventListener("click", function() {
        playIteration(this);
    }.bind(this));

    // // Обработчик окончания анимации
    // var pfx = ["webkit", "moz", "MS", "o", ""];
    // var type = "AnimationEnd";
    // for (var p = 0; p < pfx.length; p++) {
    //     if (!pfx[p]) type = type.toLowerCase();
    //     this.htmlReference.addEventListener(pfx[p] + type, function(e) {
    //         this.classList.remove(e.animationName);
    //     }, false);
    // }
}


// Метод запуска анимации юнита
Unit.prototype.startAnimation = function(animationName, speed = 1) {
    var element = this.htmlReference;
    element.classList.add(animationName);
    setTimeout(function() {
        element.classList.remove(animationName);
    }, speed * 950)
}



///////////////////////
// Статичные методы ///
///////////////////////




// Статичный метод получения массива всех юнитов

Unit.all = function() {
    return [].concat(this.player, this.enemies);
}


// Статичный метод активации следующего юнита

Unit.activateNextUnit = function() {
    // Записываем id текущего активного юнита
    var id = Unit.activeId;
    var units = Unit.all();
    // Счётчик итераций для выхода из цикла, когда все юниты мертвы
    var iterations = 0;

    // Обход всех юнитов пока не найдётся живой
    do {
        id++;
        if (id === units.length) {
            id = 0;
        }
        iterations++;
    } while (units[id].state === "dead" && iterations < units.length);

    // Делаем юнит активным и записываем его id
    units[id].setActive(id);
    return units[id];
}


// Статичный метод создания типов юнитов

Unit.createType = function(typeName, attcackPower = 10, defensePower = 10, isPlayer = false) {
    var type = {};
    type.typeName = typeName;
    type.attcackPower = attcackPower;
    type.defensePower = defensePower;
    type.isPlayer = isPlayer;
    return type;
}


// Статичный матод инициализации(создания) врагов

Unit.initializeEnemies = function(enemyAmount, type = Unit.types.waterdrop) {
    var enemies = [];

    for (var i = 0; i < enemyAmount; i++) {
        // Наполняем массив объектами
        enemies.push(new Unit(type,
            // позиционируем объекты в зависимости от их 
            // колличества и размеров игрового поля
            // X :
            (i * -30) - enemyAmount / 4 * 70,
            // Y: 
            i % 3 * -90 + 175));

        // Добавляем обработчик события по клику
        DomHelper.elements.render(enemies[i].htmlReference, enemies[i].x, enemies[i].y, enemiesContainer);
        enemies[i].updateHP();
    }

    // Возвращаем наполненный массив
    return enemies;
}


// Статичный матод инициализации(создания) игрока

Unit.initializePlayer = function(posX = 10, posY = 40) {
    var player = new Unit(Unit.types.player, posX, posY);
    DomHelper.elements.render(player.htmlReference, player.x, player.y);
    player.updateHP();
    return player;
}




/////////////////////////////////
/////////////////////////////////
/////////////////////////////////


function Enemy(type, attackPower, defensePower) {
    // body... 
}





/////////////////////////////////
/////////////////////////////////
/////////////////////////////////



// Метод создания DOM-элементов div с пользовательским классом

DomHelper.createDiv = function(classes) {
    var element = document.createElement("div");
    if (classes) {
        element.classList.add(classes);
    }
    return element;
}


// Метод создания DOM-объекта юнита
// type - название класса, которое будет добавлено к тегу изображения
// если isPlayer - истина, то к объекту добавлвяется класс player,
// иначе - enemy

DomHelper.elements.createUnit = function(type, isPlayer = false) {
    // Клонируем составные части объекта
    var element = DomHelper.elements.unit.cloneNode(false);
    var img = DomHelper.elements.img.cloneNode(false);
    if (isPlayer) {
        element.classList.add("player");
        img.classList.add("Hero");
    } else {
        element.classList.add("enemy");
        img.classList.add(type);
    }

    // Собираем всё в единое целое
    element.appendChild(DomHelper.elements.hpBar.cloneNode(false));
    element.appendChild(img);

    return element;
}


// Метод отрисовки DOM-элемента на странице в xPos, yPos
// относительно родительского элемента (игровое поле по умолчанию)

DomHelper.elements.render = function(element, posX = 10, posY = 20, parent = battleArea) {
    var newHtmlObject = parent.appendChild(element);
    newHtmlObject.style.cssText = "left: " + posX + "px; " +
        "bottom: " + posY + "px; ";
}

DomHelper.elements.unit = DomHelper.createDiv("unit"),
    DomHelper.elements.hpBar = DomHelper.createDiv("hpBar"),
    DomHelper.elements.img = DomHelper.createDiv("img")





//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////


// Функция инициализации уровня

function initializeLevel(settings) {
    // Объект-список типов юнитов
    Unit.types = {
        player: Unit.createType("player", 30, 18, true),
        waterdrop: Unit.createType("waterdrop", 1.4, 0)
    }
    Unit.count = 0;
    Unit.enemies = Unit.initializeEnemies(settings.enemyAmount);
    Unit.player = Unit.initializePlayer();
    Unit.aliveEnemies = settings.enemyAmount;
    Unit.all()[0].setActive();
}





//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////





// Инициализация уровня
initializeLevel(settings);