import { Application, Router, RouterContext } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { encode } from "https://deno.land/std/encoding/base64.ts"
const MAILJET_NEXT_API_URL = 'https://api.mailjet.com/v3.1'

const headers = new Headers();
headers.set('Content-Type', 'application/json')
headers.set('Authorization', 'Basic ' + btoa(Deno.env.get('MJ_APIKEY_PUBLIC') + ":" + Deno.env.get('MJ_APIKEY_PRIVATE')))

const sendEmail = (messages: any): Promise<any> => {
  return fetch(MAILJET_NEXT_API_URL + '/send', {
      method: "POST",
      headers,
      body: JSON.stringify({
          Messages: messages,
      }),
  });
}

const router = new Router();
router
  .post("/", async (context: RouterContext) => {
    try {
      const body = await context.request.body().value
      const message = JSON.stringify(body)
      const response = await sendEmail([
        {
          From: {
            Email: 'test@thegreenalternative.fr',
            Name: 'The Green Alternative - Test'
          },
          To: [
            {
              Email: Deno.env.get('TO_EMAIL'),
              Name: 'Test',
            },
          ],
          Subject: 'Hook received',
          TextPart: '',
          HTMLPart: '',
          Attachments: [
            {
              ContentType: 'application/json',
              Filename: body.metadata.total_page[0].document_name.replace('.pdf', '.json'),
              Content: encode(message),
            }
          ],
        },
      ])
      context.response.status = 200
      context.response.headers.set("Content-Type", "application/json")
      const jsonRes = await response.json()
      context.response.body = {
        success: response.ok,
        jsonRes
      }
    } catch (error) {
      context.response.status = 400
      context.response.headers.set("Content-Type", "application/json")
      context.response.body = {
        error
      }
    }
  });

const app = new Application();
app.use(oakCors()); // Enable CORS for All Routes
app.use(router.routes());

console.info("CORS-enabled web server listening on port 8000");
await app.listen({ port: 8000 });
