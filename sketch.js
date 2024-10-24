let json = {};
let recipes = [];
let allIngredients = [];
let population = [];
let populationSize = 50;

let recipe_number = 0;
let history = [];
const coreCategoriesScale = [
  {
    name: "grains",
    minAmount: 190,
    maxAmount: 500,
  },
  {
    name: "sugars",
    minAmount: 100,
    maxAmount: 200,
  },
  {
    name: "condiments and sauces",
    minAmount: 1,
    maxAmount: 50,
  }
];
const nonCoreCategoriesScale = [
  {
    name: "dairy",
    minAmount: 30,
    maxAmount: 200,
  },
  {
    name: "oil",
    minAmount: 30,
    maxAmount: 100,
  },
  {
    name: "vegetables and fruits",
    minAmount: 0,
    maxAmount: 200,
  },
  {
    name: "liquid",
    minAmount: 0,
    maxAmount: 200,
  },
];

function preload() {
  //json = loadJSON("data/recipes_original.json");
  json = loadJSON("data/recipes_original.json");

}

function calculateFitness(recipe) {
  // Check if all core ingredient categories are present in the recipe
  const hasAllCoreCategories = coreCategoriesScale.every((coreCategory) =>
    recipe.ingredients.some((ingredient) => ingredient.foodCategories.includes(coreCategory.name))
  );

  if (!hasAllCoreCategories) {
    return 0;
  }

  const totalCalories = recipe.ingredients.reduce((sum, ingredient) => sum + ingredient.calories, 0);
  recipe.calories = totalCalories;
  const caloriePenalty = Math.abs(totalCalories - 3500) / 3500;
  

  const coreIngredientPenalty = coreCategoriesScale.reduce((penalty, coreCategory) => {
    const categoryIngredients = recipe.ingredients.filter(
      (ingredient) => ingredient.foodCategories.includes(coreCategory.name)
    );

    const totalAmount = categoryIngredients.reduce((sum, ingredient) => sum + ingredient.amount, 0);

    const amountPenalty =
      totalAmount < coreCategory.minAmount
        ? coreCategory.minAmount - totalAmount
        : totalAmount > coreCategory.maxAmount
        ? totalAmount - coreCategory.maxAmount
        : 0;

    return penalty + amountPenalty;
  }, 0);

  const nonCoreIngredientPenalty = nonCoreCategoriesScale.reduce((penalty, nonCoreCategory) => {
    const categoryIngredients = recipe.ingredients.filter(
      (ingredient) => ingredient.foodCategories.includes(nonCoreCategory.name)
    );

    const totalAmount = categoryIngredients.reduce((sum, ingredient) => sum + ingredient.amount, 0);

    const amountPenalty =
      totalAmount < nonCoreCategory.minAmount
        ? nonCoreCategory.minAmount - totalAmount
        : totalAmount > nonCoreCategory.maxAmount
        ? totalAmount - nonCoreCategory.maxAmount
        : 0;

    return penalty + amountPenalty;
  }, 0);

  const uniqueIngredients = new Set(recipe.ingredients.map((ingredient) => ingredient.ingredient));
  const varietyReward = uniqueIngredients.size;

  const minimumIngredientsPenalty = Math.max(0, 8 - uniqueIngredients.size);
  
  const varietyWeight = 5; 
  const minimumIngredientsWeight = 10; 

  const weightedVarietyReward = varietyWeight * varietyReward;
  const weightedMinimumIngredientsPenalty = minimumIngredientsWeight * minimumIngredientsPenalty;

  const fitness =
    1 /
    (1 +
      caloriePenalty +
      coreIngredientPenalty +
      nonCoreIngredientPenalty +
      weightedMinimumIngredientsPenalty -
      weightedVarietyReward);

//   const fitness =
//     1 /
//     (1 +
//       caloriePenalty +
//       coreIngredientPenalty +
//       nonCoreIngredientPenalty -
//       weightedVarietyReward +
//       weightedMinimumIngredientsPenalty);

  return fitness;
}


function setup() {
  createCanvas(400, 400);
  recipes = json.recipes;

  
  // extract all of the ingredients from the inspiring set
  for (const r of recipes) {
    for (const i of r.ingredients) {
      allIngredients.push(i);
    }
  }
  console.log(allIngredients.length)
  // create an initial population
  for (let i = 0; i < populationSize; i++) {
    population.push(random(recipes));
  }
  evaluateRecipes(population);
  population.sort((a, b) => b.fitness - a.fitness);
  
  frameRate(2);
}

function evaluateRecipes(recipes) {
  for (const r of recipes) {
    // fitness is the number of ingredients
    r.fitness = calculateFitness(r);
  }
}

// Implements a roulette wheel selection
function selectRecipe(recipes) {
  let sum = recipes.reduce((a, r) => a + r.fitness, 0);
  // choose a random number less than the sum of fitnesses
  let f = int(random(sum));
  // iterate through all items in the recipes
  for (const r of recipes) {
    // if f is less than a recipe's fitness, return it
    if (f < r.fitness) return r;
    // otherwise subtract the recipe's fitness from f
    f -= r.fitness;
  }
  // if no recipe has been returned, return the last one
  return recipes[recipes.length - 1];
}

function generateRecipes(size, population) {
  let R = [];
  while (R.length < size) {
    let r1 = selectRecipe(population);
    let r2 = selectRecipe(population);
    let r = crossoverRecipes(r1, r2);
    mutateRecipe(r);
    normaliseRecipe(r);
    
    R.push(r);
    
  }
  evaluateRecipes(R);
  return R;
}

function selectPopulation(P, R) {
  R.sort((a, b) => b.fitness - a.fitness);
  P = P.slice(0, P.length/2).concat(R.slice(0, R.length/2));
  P.sort((a, b) => b.fitness - a.fitness);
  return P;
}

function update() {
  let R = generateRecipes(populationSize, population);
  population = selectPopulation(population, R);
}

function draw() {
  update();
  background(255);
  history.push(population[0].fitness);
  stroke(255, 0, 0);  

  // Normalize fitness values to fit within the display range
  let maxFitness = Math.max(...history);
  let normalizedHistory = history.map((fitness) => map(fitness, 0, maxFitness, 0, height));

  for (let i = 0; i < min(normalizedHistory.length, width); i++) {
    line(width - i, height - normalizedHistory[normalizedHistory.length - 1 - i], width - i, height);
  }

  noStroke();
  text("max. fitness = " + maxFitness, width - 140, 40);

  let recipe_text = population[0].name + "\n"+" (Calories: " + population[0].calories + ")\n";
  for (let i of population[0].ingredients) {
    recipe_text += "\n" + i.amount + i.unit + " " + i.ingredient;
  }
  text(recipe_text, 40, 40);
  console.log(recipe_text);
}

function crossoverRecipes(r1, r2) {
  // choose crossover point in r1
  let p1 = int(random(r1.ingredients.length));
  // choose crossover point in r2
  let p2 = int(random(r2.ingredients.length));
  // get first ingredient sublist from r1
  let r1a = r1.ingredients.slice(0, p1);
  // get second ingredient sublist from r2
  let r2b = r2.ingredients.slice(p2);
  // create a new recipe
  let r = {};
  // add a default name
  r.name = "recipe " + recipe_number++;
  // add ingredients from sublists
  r.ingredients = r1a.concat(r2b);
  return r;
}

function mutateRecipe(r) {
  switch (int(random(4))) {
    case 0:
      // select a random ingredient
      let i = int(random(r.ingredients.length));
      // make a copy of the ingredient
      r.ingredients[i] = Object.assign({}, r.ingredients[i]);
      // change the amount of the ingredient by a small amount
      r.ingredients[i].amount += int(r.ingredients[i].amount * 0.1);
      // r.ingredients[i].amount += int(r.ingredients[i].amount * Math.random());
      // check that the amount is at least 1
      r.ingredients[i].amount = max(1, r.ingredients[i].amount);
      break;
    case 1:
      // select a random ingredient
      let j = random(r.ingredients.length);
      // make a copy of the ingredient
      r.ingredients[j] = Object.assign({}, r.ingredients[j]);
      // change the ingredient by selecting from all ingredients
      r.ingredients[j].ingredient = random(allIngredients).ingredient;
      break;
    case 2:
      // add an ingredient from all ingredients
      r.ingredients.push(random(allIngredients));
      break;
    case 3:
          // remove an ingredient
      if (r.ingredients.length > 1) {
        r.ingredients.splice(random(r.ingredients.length), 1);
      }
      break;
  }
}

function normaliseRecipe(r) {
  // before normalising the ingredient amounts
  // reformulate the recipe into unique ingredients
  let uniqueIngredientMap = new Map();
  for (const i of r.ingredients) {
    // if the map already has the ingredient add the amount
    if (uniqueIngredientMap.has(i.ingredient)) {
      let n = uniqueIngredientMap.get(i.ingredient);
      n.amount += i.amount;
    } else { // otherwise add a copy of the ingredient
      uniqueIngredientMap.set(i.ingredient, Object.assign({}, i));
    }
  }
  r.ingredients = Array.from(uniqueIngredientMap.values());
  
  // calculate the sum of all of the ingredient amounts
  let sum = r.ingredients.reduce((a, i) => a + i.amount, 0);
  // calculate the scaling factor to 1L of soup (ingredients)
  let scale = 1000 / sum;
  // rescale all of the ingredient amounts
  for (let i of r.ingredients) {
    i.amount = max(1, int(i.amount * scale));
  }
}