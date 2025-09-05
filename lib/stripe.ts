git checkout -b hotfix/stripe-apiversion
sed -i '' -e 's/"2024-06-20"/"2023-10-16"/' lib/stripe.ts
git commit -am "fix(stripe): align apiVersion to installed SDK types"
git push
