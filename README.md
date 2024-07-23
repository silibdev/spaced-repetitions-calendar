# SpacedRepetitionsCalendar

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 13.0.3.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Update database.type
Go in the folder _netlify/utils_.  
You need an access token too, _export SUPABASE_ACCESS_TOKEN=_.  
The process may block, check the output file, it could ask for something.

`npx supabase gen types typescript --project-id wwquwqcvoqbrmadllcmo --schema db > database.type.ts`

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Release
Do a release with git-flow, update the version with npm and then finish the release deleting the tag created by npm (we're using the git-flow one).

Example:
```bash
$ git-flow release start 1.6.1
$ npm version 1.6.1
$ git tag -d v1.6.1
$ git-flow release finish 1.6.1
```
