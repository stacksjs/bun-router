import process from 'node:process'
import { CAC } from 'cac'
import { version } from '../package.json'
import { config } from '../src/config'

const cli = new CAC('router')

interface CLIOptions {
  verbose?: boolean
}

cli
  .command('start', 'Start the router server')
  .option('--verbose', 'Enable verbose logging')
  .example('router start --verbose')
  .action(async (_options?: CLIOptions) => {
    //
  })

cli.command('version', 'Show the version of the Reverse Proxy CLI').action(() => {
  console.log(version)
})

cli.version(version)
cli.help()
cli.parse()
